import path from 'node:path';
import fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';
import { initDatabase, getDatabase } from '../src/database/db';
import { GeolocationService } from '../src/services/geo/geolocationService';
import { StrangerCamService } from '../src/services/stranger/strangerCamService';
import { StrangerChatService } from '../src/services/stranger/strangerChatService';

const TEST_DB_PATH = path.resolve(process.cwd(), 'data', 'strict_geo_test.db');
process.env.DATABASE_PATH = TEST_DB_PATH;
process.env.STRANGER_CAM_ENABLED = 'true';

async function runStrictGeolocationTests() {
  console.log('===============================================================');
  console.log('    NIVA — STRICT SEMARANG HARD GEOLOCATION GATE TEST SUITE    ');
  console.log('===============================================================\n');

  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }

  initDatabase(TEST_DB_PATH);
  const db = getDatabase(TEST_DB_PATH);

  // Clean tables
  db.prepare('DELETE FROM stranger_queue').run();
  db.prepare('DELETE FROM stranger_chat_queue').run();
  db.prepare('DELETE FROM stranger_sessions').run();
  db.prepare('DELETE FROM location_confirmations').run();
  db.prepare('DELETE FROM location_verifications').run();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? '(' + detail + ')' : ''}`);
      failed++;
    }
  }

  // ── 1. KOTA SEMARANG ADMINISTRATIVE BOUNDARY TESTS ─────────────────────────
  console.log('\n--- 1. Kota Semarang Official Administrative Boundary ---');
  const kotaPoints = [
    { name: 'Simpang Lima (Center)', lat: -6.9904, lon: 110.4229 },
    { name: 'Tanjung Emas Port (North)', lat: -6.9460, lon: 110.4250 },
    { name: 'Tembalang UNDIP (South)', lat: -7.0520, lon: 110.4390 },
    { name: 'Tugu / Mangkang (West)', lat: -6.9750, lon: 110.3150 },
    { name: 'Genuk (East)', lat: -6.9600, lon: 110.4850 },
    { name: 'Gunungpati UNNES (Hills)', lat: -7.0480, lon: 110.3920 },
  ];

  for (const pt of kotaPoints) {
    const userId = `user_kota_${uuidv4().slice(0, 8)}`;
    const res = GeolocationService.verifyLocation({
      userId,
      latitude: pt.lat,
      longitude: pt.lon,
      accuracy: 15,
      timestamp: Date.now(),
    });

    assert(
      res.allowed === true && res.region === 'CITY_SEMARANG' && res.locationVerified === true,
      `Kota Semarang: ${pt.name} -> CITY_SEMARANG`,
      `Got allowed: ${res.allowed}, region: ${res.region}`
    );
  }

  // ── 2. KABUPATEN SEMARANG ADMINISTRATIVE BOUNDARY TESTS ────────────────────
  console.log('\n--- 2. Kabupaten Semarang Official Administrative Boundary ---');
  const kabPoints = [
    { name: 'Ungaran Barat', lat: -7.1398, lon: 110.4042 },
    { name: 'Ambarawa', lat: -7.2612, lon: 110.4017 },
    { name: 'Bandungan', lat: -7.2185, lon: 110.3700 },
    { name: 'Bawen', lat: -7.2450, lon: 110.4350 },
  ];

  for (const pt of kabPoints) {
    const userId = `user_kab_${uuidv4().slice(0, 8)}`;
    const res = GeolocationService.verifyLocation({
      userId,
      latitude: pt.lat,
      longitude: pt.lon,
      accuracy: 25,
      timestamp: Date.now(),
    });

    assert(
      res.allowed === true && res.region === 'REGENCY_SEMARANG' && res.locationVerified === true,
      `Kabupaten Semarang: ${pt.name} -> REGENCY_SEMARANG`,
      `Got allowed: ${res.allowed}, region: ${res.region}`
    );
  }

  // ── 3. OUTSIDE SEMARANG & ENCLAVE TESTS ─────────────────────────────────────
  console.log('\n--- 3. Outside Semarang & Enclave Exclusion ---');
  const outsidePoints = [
    {
      name: 'Kota Salatiga Center (Enclave encircled by Kabupaten Semarang)',
      lat: -7.3305,
      lon: 110.5084,
    },
    { name: 'Demak Center (Masjid Agung Demak)', lat: -6.8944, lon: 110.6385 },
    { name: 'Kendal Alun-Alun', lat: -6.9208, lon: 110.2039 },
    { name: 'Grobogan / Purwodadi', lat: -7.0869, lon: 110.9161 },
    { name: 'Boyolali Center', lat: -7.5333, lon: 110.5960 },
    { name: 'Jakarta Monas', lat: -6.1754, lon: 106.8272 },
  ];

  for (const pt of outsidePoints) {
    const userId = `user_out_${uuidv4().slice(0, 8)}`;
    const res = GeolocationService.verifyLocation({
      userId,
      latitude: pt.lat,
      longitude: pt.lon,
      accuracy: 20,
      timestamp: Date.now(),
    });

    assert(
      res.allowed === false &&
        res.region === 'OUTSIDE_SEMARANG' &&
        res.locationStatus === 'LOCATION_OUTSIDE',
      `Outside Point Strictly Denied: ${pt.name}`,
      `Got allowed: ${res.allowed}, region: ${res.region}`
    );
  }

  // ── 4. ACCURACY POLICY & UNCERTAINTY TESTS ──────────────────────────────────
  console.log('\n--- 4. GPS Accuracy Policy & Uncertainty ---');
  {
    const userId = `user_acc_err_${uuidv4().slice(0, 8)}`;
    const res = GeolocationService.verifyLocation({
      userId,
      latitude: -6.9904,
      longitude: 110.4229,
      accuracy: 6500, // 6.5 km error radius!
      timestamp: Date.now(),
    });

    assert(
      res.allowed === false && res.locationStatus === 'LOCATION_UNCERTAIN',
      'Accuracy > 5000m yields LOCATION_UNCERTAIN and rejects entry',
      `Got status: ${res.locationStatus}`
    );
  }

  {
    const userId = `user_acc_ok_${uuidv4().slice(0, 8)}`;
    const res = GeolocationService.verifyLocation({
      userId,
      latitude: -6.9904,
      longitude: 110.4229,
      accuracy: 35, // good GPS fix
      timestamp: Date.now(),
    });

    assert(
      res.allowed === true && res.locationStatus === 'LOCATION_VERIFIED',
      'Valid GPS accuracy (35m) yields LOCATION_VERIFIED'
    );
  }

  // ── 5. FRESHNESS & STALENESS TESTS ──────────────────────────────────────────
  console.log('\n--- 5. Freshness & Staleness Defense ---');
  {
    const userId = `user_stale_${uuidv4().slice(0, 8)}`;
    const staleTime = Date.now() - 400 * 1000; // 400s old
    const res = GeolocationService.verifyLocation({
      userId,
      latitude: -6.9904,
      longitude: 110.4229,
      accuracy: 20,
      timestamp: staleTime,
    });

    assert(
      res.allowed === false && res.locationStatus === 'LOCATION_STALE',
      'Coordinates older than 300s rejected as LOCATION_STALE',
      `Got status: ${res.locationStatus}`
    );
  }

  {
    const userId = `user_future_${uuidv4().slice(0, 8)}`;
    const futureTime = Date.now() + 120 * 1000; // 2 minutes into future
    const res = GeolocationService.verifyLocation({
      userId,
      latitude: -6.9904,
      longitude: 110.4229,
      accuracy: 20,
      timestamp: futureTime,
    });

    assert(
      res.allowed === false && res.locationStatus === 'LOCATION_SPOOF_SUSPECTED',
      'Future timestamp drift > 60s rejected as LOCATION_SPOOF_SUSPECTED',
      `Got status: ${res.locationStatus}`
    );
  }

  {
    const userId = `user_db_stale_${uuidv4().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO location_confirmations (user_id, region, method, confirmed_at, expires_at, location_status)
      VALUES (?, 'CITY_SEMARANG', 'BROWSER_GEO', datetime('now', '-2 hours'), datetime('now', '-1 hour'), 'LOCATION_VERIFIED')
    `).run(userId);

    const freshness = GeolocationService.isUserLocationFresh(userId);
    assert(
      freshness.verified === false && freshness.locationStatus === 'LOCATION_STALE',
      'Database TTL check identifies expired verification as LOCATION_STALE'
    );
  }

  // ── 6. ANTI-SPOOFING & IMPOSSIBLE MOVEMENT ───────────────────────────────────
  console.log('\n--- 6. Anti-Spoofing & Impossible Velocity ---');
  {
    GeolocationService.clearCache();
    const userId = `user_teleport_${uuidv4().slice(0, 8)}`;

    const fix1 = GeolocationService.verifyLocation({
      userId,
      latitude: -6.9904, // Simpang Lima
      longitude: 110.4229,
      accuracy: 10,
      timestamp: Date.now() - 5000,
    });
    assert(fix1.allowed === true, 'Initial fix in Simpang Lima accepted');

    const fix2 = GeolocationService.verifyLocation({
      userId,
      latitude: -7.2612, // Ambarawa (~35km away in 5s)
      longitude: 110.4017,
      accuracy: 10,
      timestamp: Date.now(),
    });

    assert(
      fix2.allowed === false && fix2.locationStatus === 'LOCATION_SPOOF_SUSPECTED',
      'Teleportation (>300 km/h) flagged as LOCATION_SPOOF_SUSPECTED',
      `Got status: ${fix2.locationStatus}`
    );
  }

  // ── 7. ZERO TRUST & CLIENT TAMPERING ATTEMPTS ──────────────────────────────
  console.log('\n--- 7. Zero Trust & Client Tampering Attempts ---');
  {
    const userId = `user_tamper_${uuidv4().slice(0, 8)}`;
    StrangerCamService.getOrCreateStrangerUser({ userId, is18Plus: true });

    let threw = false;
    try {
      // Trying to self-declare USER_CONFIRMATION without coordinates
      StrangerCamService.confirmSemarangLocation(userId, 'USER_CONFIRMATION');
    } catch {
      threw = true;
    }
    assert(threw, 'USER_CONFIRMATION without coordinates is strictly rejected');

    const invalidCoordRes = GeolocationService.verifyLocation({
      userId,
      latitude: NaN,
      longitude: 110.4229,
    });
    assert(
      invalidCoordRes.allowed === false && invalidCoordRes.locationStatus === 'LOCATION_DENIED',
      'NaN coordinates rejected as LOCATION_DENIED'
    );
  }

  // ── 8. MATCHMAKING HARD GATE ENFORCEMENT ─────────────────────────────────────
  console.log('\n--- 8. Matchmaking Hard Security Gate ---');
  {
    const unverifiedUser = `cam_unverified_${uuidv4().slice(0, 8)}`;
    StrangerCamService.getOrCreateStrangerUser({ userId: unverifiedUser, is18Plus: true });

    const queueRes = StrangerCamService.joinQueue(unverifiedUser);
    assert(
      queueRes.success === false && queueRes.status === 'INELIGIBLE',
      'Unverified user blocked from Stranger Cam queue with INELIGIBLE'
    );

    let chatThrew = false;
    try {
      StrangerChatService.enterQueue(unverifiedUser);
    } catch {
      chatThrew = true;
    }
    assert(chatThrew, 'Unverified user blocked from Stranger Chat queue');

    // Now verify the user in Kota Semarang
    const verif = GeolocationService.verifyLocation({
      userId: unverifiedUser,
      latitude: -6.9904,
      longitude: 110.4229,
      accuracy: 10,
      timestamp: Date.now(),
    });
    assert(verif.allowed === true, 'Verification succeeds in Simpang Lima');

    const camJoin = StrangerCamService.joinQueue(unverifiedUser);
    assert(camJoin.success === true && camJoin.status === 'QUEUED', 'Verified user successfully enters Stranger Cam queue');
    StrangerCamService.leaveQueue(unverifiedUser);
  }

  // ── 9. ACTIVE SESSION RELOCATION TERMINATION ────────────────────────────────
  console.log('\n--- 9. Active Session Relocation Termination ---');
  {
    const userA = `cam_sess_a_${uuidv4().slice(0, 8)}`;
    const userB = `cam_sess_b_${uuidv4().slice(0, 8)}`;
    StrangerCamService.getOrCreateStrangerUser({ userId: userA, is18Plus: true });
    StrangerCamService.getOrCreateStrangerUser({ userId: userB, is18Plus: true });

    GeolocationService.verifyLocation({
      userId: userA,
      latitude: -6.9904,
      longitude: 110.4229,
      accuracy: 10,
      timestamp: Date.now(),
    });
    GeolocationService.verifyLocation({
      userId: userB,
      latitude: -6.9904,
      longitude: 110.4229,
      accuracy: 10,
      timestamp: Date.now(),
    });

    const sessionId = uuidv4();
    db.prepare(`
      INSERT INTO stranger_sessions (id, user_a_id, user_b_id, status, started_at)
      VALUES (?, ?, ?, 'CONNECTED', datetime('now'))
    `).run(sessionId, userA, userB);

    // User A moves to Demak during the call
    const recheckCam = StrangerCamService.recheckSessionLocation(sessionId, userA, {
      latitude: -6.8944, // Demak
      longitude: 110.6385,
      accuracy: 20,
      timestamp: Date.now(),
    });

    assert(
      recheckCam.valid === false &&
        recheckCam.sessionEnded === true &&
        recheckCam.reason === 'OUTSIDE_ALLOWED_REGION',
      'Stranger Cam active session terminates with OUTSIDE_ALLOWED_REGION on relocation'
    );

    const camDbCheck = db.prepare('SELECT status, end_reason FROM stranger_sessions WHERE id = ?').get(sessionId) as any;
    assert(
      camDbCheck.status === 'ENDED' && camDbCheck.end_reason === 'OUTSIDE_ALLOWED_REGION',
      'Stranger Cam session marked ENDED in database'
    );

    // Text Chat relocation check
    const chatSessId = uuidv4();
    db.prepare(`
      INSERT INTO stranger_sessions (id, user_a_id, user_b_id, status, session_type, started_at)
      VALUES (?, ?, ?, 'CONNECTED', 'TEXT', datetime('now'))
    `).run(chatSessId, userA, userB);

    const recheckChat = StrangerChatService.recheckSessionLocation(chatSessId, userA, {
      latitude: -7.3305, // Salatiga enclave
      longitude: 110.5084,
      accuracy: 15,
      timestamp: Date.now(),
    });

    assert(
      recheckChat.valid === false &&
        recheckChat.sessionEnded === true &&
        recheckChat.reason === 'OUTSIDE_ALLOWED_REGION',
      'Stranger Chat active session terminates with OUTSIDE_ALLOWED_REGION on relocation to Salatiga enclave'
    );

    const chatDbCheck = db.prepare('SELECT status, end_reason FROM stranger_sessions WHERE id = ?').get(chatSessId) as any;
    assert(
      chatDbCheck.status === 'ENDED' && chatDbCheck.end_reason === 'OUTSIDE_ALLOWED_REGION',
      'Stranger Chat session marked ENDED in database'
    );
  }

  // ── 10. API ROUTE HANDLERS INTEGRATION TESTS ────────────────────────────────
  console.log('\n--- 10. API Route Handlers Integration Tests ---');
  {
    const { POST: locationConfirmRoute } = await import('../app/api/stranger-cam/location-confirm/route');
    const { POST: geoVerifyRoute } = await import('../app/api/geo/verify/route');
    const { POST: strangerCamQueueRoute } = await import('../app/api/stranger-cam/queue/route');
    const { POST: strangerChatQueueRoute } = await import('../app/api/stranger-chat/queue/route');
    const { NextRequest } = await import('next/server');

    // 10.1. Client injection attempt: passes allowed: true without coordinates
    const fakePayloadReq = new NextRequest('http://localhost:3000/api/stranger-cam/location-confirm', {
      method: 'POST',
      body: JSON.stringify({
        userId: `inject_user_${uuidv4().slice(0, 8)}`,
        allowed: true,
        region: 'CITY_SEMARANG',
      }),
    });
    const fakeRes = await locationConfirmRoute(fakePayloadReq);
    assert(fakeRes.status === 400, 'Route strictly rejects missing coordinates payload with HTTP 400');

    // 10.2. Route verification with Salatiga coordinates returns HTTP 403
    const salatigaReq = new NextRequest('http://localhost:3000/api/stranger-cam/location-confirm', {
      method: 'POST',
      body: JSON.stringify({
        userId: `route_sal_${uuidv4().slice(0, 8)}`,
        latitude: -7.3305,
        longitude: 110.5084,
        accuracy: 20,
      }),
    });
    const salatigaRes = await locationConfirmRoute(salatigaReq);
    const salatigaData = await salatigaRes.json();
    assert(
      salatigaRes.status === 403 && salatigaData.allowed === false && salatigaData.region === 'OUTSIDE_SEMARANG',
      'Route returns HTTP 403 with OUTSIDE_SEMARANG for Salatiga coordinates'
    );

    // 10.3. Route verification with Simpang Lima coordinates returns HTTP 200
    const testSimpangUser = `route_simp_${uuidv4().slice(0, 8)}`;
    const simpangReq = new NextRequest('http://localhost:3000/api/geo/verify', {
      method: 'POST',
      body: JSON.stringify({
        userId: testSimpangUser,
        latitude: -6.9904,
        longitude: 110.4229,
        accuracy: 20,
      }),
    });
    const simpangRes = await geoVerifyRoute(simpangReq);
    const simpangData = await simpangRes.json();
    assert(
      simpangRes.status === 200 && simpangData.allowed === true && simpangData.region === 'CITY_SEMARANG',
      'Unified /api/geo/verify returns HTTP 200 with CITY_SEMARANG'
    );

    // 10.4. Unverified user attempting to join Stranger Cam queue returns HTTP 403
    const unverifiedQueueReq = new NextRequest('http://localhost:3000/api/stranger-cam/queue', {
      method: 'POST',
      body: JSON.stringify({
        action: 'JOIN',
        userId: `no_geo_${uuidv4().slice(0, 8)}`,
      }),
    });
    const unverifiedQueueRes = await strangerCamQueueRoute(unverifiedQueueReq);
    assert(unverifiedQueueRes.status === 403, 'Stranger Cam queue returns HTTP 403 for unverified location');

    // 10.5. Unverified user attempting to join Stranger Chat queue returns HTTP 403
    const unverifiedChatReq = new NextRequest('http://localhost:3000/api/stranger-chat/queue', {
      method: 'POST',
      body: JSON.stringify({
        action: 'ENTER',
        userId: `no_chat_geo_${uuidv4().slice(0, 8)}`,
      }),
    });
    const unverifiedChatRes = await strangerChatQueueRoute(unverifiedChatReq);
    assert(unverifiedChatRes.status === 403, 'Stranger Chat queue returns HTTP 403 for unverified location');
  }

  console.log('\n===============================================================');
  console.log(`TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runStrictGeolocationTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
