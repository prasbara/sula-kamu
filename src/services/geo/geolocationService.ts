import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/db';
import semarangBoundaryDataset from '../../data/geo/semarangBoundaries.json';

export type LocationStatus =
  | 'LOCATION_REQUIRED'
  | 'LOCATION_REQUESTING'
  | 'LOCATION_ACQUIRED'
  | 'LOCATION_VERIFYING'
  | 'LOCATION_VERIFIED'
  | 'LOCATION_UNCERTAIN'
  | 'LOCATION_DENIED'
  | 'LOCATION_STALE'
  | 'LOCATION_OUTSIDE'
  | 'LOCATION_SPOOF_SUSPECTED';

export type SemarangRegion =
  | 'CITY_SEMARANG'
  | 'REGENCY_SEMARANG'
  | 'OUTSIDE_SEMARANG'
  | 'UNKNOWN';

export interface VerifyLocationInput {
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp?: number;
  sessionId?: string;
}

export interface VerifyLocationResult {
  allowed: boolean;
  region: SemarangRegion;
  locationStatus: LocationStatus;
  locationVerified: boolean;
  reason?: string;
  expiresAt?: string;
  riskScore: number;
  accuracy?: number;
  boundaryVersion: string;
}

interface LastFixEntry {
  latitude: number;
  longitude: number;
  timestamp: number;
}

// In-memory ephemeral fix cache for impossible speed detection (cleared after 1 hour)
const ephemeralFixCache = new Map<string, LastFixEntry>();

// Maximum permitted movement speed (km/h) for defense-in-depth spoof detection
const MAX_REALISTIC_SPEED_KMH = 300;

// Maximum coordinate age in seconds (5 minutes)
const MAX_COORDINATE_AGE_SEC = 300;

// Location verification validity window in minutes
export const LOCATION_VERIFICATION_WINDOW_MINUTES = 30;

// Maximum acceptable GPS accuracy in meters (accuracy > 5000m is deemed too uncertain)
const MAX_ACCURACY_METERS = 5000;

export class GeolocationService {
  public static readonly DATASET_VERSION = semarangBoundaryDataset.boundary_dataset_version;
  public static readonly DATASET_SOURCE = semarangBoundaryDataset.boundary_source;

  // ── Mathematical GIS Ray-Casting Algorithm ────────────────────────────────

  /**
   * Ray-Casting algorithm for point-in-ring.
   * point: [lon, lat], ring: array of [lon, lat]
   */
  public static pointInRing(lon: number, lat: number, ring: number[][]): boolean {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];

      const intersect =
        yi > lat !== yj > lat &&
        lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;

      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Check if point is inside a GeoJSON Polygon (outer ring, excluding inner hole rings).
   */
  public static pointInPolygon(lon: number, lat: number, rings: number[][][]): boolean {
    if (!rings || rings.length === 0) return false;

    // Must be inside the outer perimeter ring
    if (!this.pointInRing(lon, lat, rings[0])) {
      return false;
    }

    // Must NOT be inside any interior ring (holes / enclaves)
    for (let i = 1; i < rings.length; i++) {
      if (this.pointInRing(lon, lat, rings[i])) {
        return false; // Point falls inside an excluded hole
      }
    }

    return true;
  }

  /**
   * Check if point is inside a GeoJSON MultiPolygon (array of polygons).
   */
  public static pointInMultiPolygon(lon: number, lat: number, polygons: number[][][][]): boolean {
    if (!polygons || polygons.length === 0) return false;
    for (const poly of polygons) {
      if (this.pointInPolygon(lon, lat, poly)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Bounding box pre-filter for performance:
   * bbox format in dataset: [minLat, minLon, maxLat, maxLon]
   */
  private static isInBbox(lat: number, lon: number, bbox: number[]): boolean {
    const [minLat, minLon, maxLat, maxLon] = bbox;
    return lat >= minLat && lat <= maxLat && lon >= minLon && lon <= maxLon;
  }

  /**
   * Authoritative region classification using official administrative boundary polygons.
   * Priority:
   * 1. Check Salatiga enclave (explicitly encircled by Kabupaten Semarang, but administratively distinct -> DENIED)
   * 2. Check Kota Semarang boundary -> CITY_SEMARANG (ALLOWED)
   * 3. Check Kabupaten Semarang boundary -> REGENCY_SEMARANG (ALLOWED)
   * 4. Otherwise -> OUTSIDE_SEMARANG (DENIED)
   */
  public static classifyCoordinates(latitude: number, longitude: number): SemarangRegion {
    const features = semarangBoundaryDataset.features as any;

    // 1. Explicit Salatiga Enclave Exclusion
    const salatiga = features.SALATIGA_ENCLAVE;
    if (salatiga && this.isInBbox(latitude, longitude, salatiga.bbox)) {
      const inSalatiga =
        salatiga.type === 'Polygon'
          ? this.pointInPolygon(longitude, latitude, salatiga.coordinates)
          : this.pointInMultiPolygon(longitude, latitude, salatiga.coordinates);

      if (inSalatiga) {
        return 'OUTSIDE_SEMARANG';
      }
    }

    // 2. Kota Semarang Administrative Boundary Check
    const kota = features.CITY_SEMARANG;
    if (kota && this.isInBbox(latitude, longitude, kota.bbox)) {
      const inKota =
        kota.type === 'Polygon'
          ? this.pointInPolygon(longitude, latitude, kota.coordinates)
          : this.pointInMultiPolygon(longitude, latitude, kota.coordinates);

      if (inKota) {
        return 'CITY_SEMARANG';
      }
    }

    // 3. Kabupaten Semarang Administrative Boundary Check
    const kab = features.REGENCY_SEMARANG;
    if (kab && this.isInBbox(latitude, longitude, kab.bbox)) {
      const inKab =
        kab.type === 'Polygon'
          ? this.pointInPolygon(longitude, latitude, kab.coordinates)
          : this.pointInMultiPolygon(longitude, latitude, kab.coordinates);

      if (inKab) {
        return 'REGENCY_SEMARANG';
      }
    }

    return 'OUTSIDE_SEMARANG';
  }

  // ── Anti-Spoofing & Geodetic Distance Helpers ───────────────────────────────

  /**
   * Haversine formula to compute great-circle distance between two coordinates in kilometers.
   */
  public static calculateHaversineDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // ── Core Hard Geolocation Gate Verification ────────────────────────────────

  /**
   * Validate and verify user coordinates against administrative boundaries, freshness,
   * accuracy, and anti-spoofing policies.
   */
  public static verifyLocation(input: VerifyLocationInput): VerifyLocationResult {
    const { userId, latitude, longitude, accuracy, timestamp, sessionId } = input;
    const now = Date.now();
    let riskScore = 0;

    // 1. Coordinate Validation: Range & Type Check
    if (
      typeof latitude !== 'number' ||
      typeof longitude !== 'number' ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return {
        allowed: false,
        region: 'UNKNOWN',
        locationStatus: 'LOCATION_DENIED',
        locationVerified: false,
        reason: 'Koordinat GPS tidak valid atau kosong.',
        riskScore: 1.0,
        boundaryVersion: this.DATASET_VERSION,
      };
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return {
        allowed: false,
        region: 'UNKNOWN',
        locationStatus: 'LOCATION_DENIED',
        locationVerified: false,
        reason: 'Koordinat GPS berada di luar rentang geografis yang valid.',
        riskScore: 1.0,
        boundaryVersion: this.DATASET_VERSION,
      };
    }

    const coordTime =
      timestamp !== undefined && !Number.isNaN(Number(timestamp)) ? Number(timestamp) : now;

    // 2. Timestamp Freshness Check
    if (timestamp !== undefined) {
      if (Number.isNaN(coordTime)) {
        return {
          allowed: false,
          region: 'UNKNOWN',
          locationStatus: 'LOCATION_SPOOF_SUSPECTED',
          locationVerified: false,
          reason: 'Timestamp koordinat tidak valid.',
          riskScore: 0.9,
          boundaryVersion: this.DATASET_VERSION,
        };
      }

      // Check future drift (more than 60 seconds into the future)
      if (coordTime > now + 60_000) {
        return {
          allowed: false,
          region: 'UNKNOWN',
          locationStatus: 'LOCATION_SPOOF_SUSPECTED',
          locationVerified: false,
          reason: 'Timestamp koordinat terdeteksi di masa depan (indikasi manipulasi waktu perangkat).',
          riskScore: 0.9,
          boundaryVersion: this.DATASET_VERSION,
        };
      }

      // Check staleness (older than 300 seconds)
      const ageSeconds = (now - coordTime) / 1000;
      if (ageSeconds > MAX_COORDINATE_AGE_SEC) {
        return {
          allowed: false,
          region: 'UNKNOWN',
          locationStatus: 'LOCATION_STALE',
          locationVerified: false,
          reason: `Koordinat GPS sudah kedaluwarsa (${Math.round(ageSeconds)} detik). Silakan dapatkan posisi GPS baru.`,
          riskScore: 0.3,
          boundaryVersion: this.DATASET_VERSION,
        };
      }
    }

    // 3. Accuracy Check
    if (accuracy !== undefined) {
      if (typeof accuracy !== 'number' || accuracy < 0) {
        return {
          allowed: false,
          region: 'UNKNOWN',
          locationStatus: 'LOCATION_UNCERTAIN',
          locationVerified: false,
          reason: 'Nilai akurasi GPS tidak valid.',
          riskScore: 0.5,
          boundaryVersion: this.DATASET_VERSION,
        };
      }

      if (accuracy > MAX_ACCURACY_METERS) {
        return {
          allowed: false,
          region: 'UNKNOWN',
          locationStatus: 'LOCATION_UNCERTAIN',
          locationVerified: false,
          reason: `Akurasi sinyal GPS terlalu rendah (${Math.round(accuracy)}m). NIVA memerlukan akurasi lebih baik dari 5000m untuk memastikan batas wilayah.`,
          riskScore: 0.4,
          accuracy,
          boundaryVersion: this.DATASET_VERSION,
        };
      }
    }

    // 4. Anti-Spoofing: Impossible Movement Check
    const cacheKey = `${userId}_${sessionId || 'default'}`;
    const previousFix = ephemeralFixCache.get(cacheKey) || ephemeralFixCache.get(userId);

    if (previousFix) {
      const timeDiffHours = Math.abs(coordTime - previousFix.timestamp) / (1000 * 60 * 60);
      if (timeDiffHours > 0.0001) {
        // Only evaluate if at least ~0.36 seconds have passed
        const distanceKm = this.calculateHaversineDistanceKm(
          previousFix.latitude,
          previousFix.longitude,
          latitude,
          longitude
        );
        const speedKmh = distanceKm / timeDiffHours;

        if (speedKmh > MAX_REALISTIC_SPEED_KMH && distanceKm > 1.0) {
          riskScore += 0.85;
          return {
            allowed: false,
            region: 'UNKNOWN',
            locationStatus: 'LOCATION_SPOOF_SUSPECTED',
            locationVerified: false,
            reason: 'Perpindahan lokasi tidak wajar terdeteksi (kecepatan perpindahan melebihi batas fisik).',
            riskScore,
            accuracy,
            boundaryVersion: this.DATASET_VERSION,
          };
        }
      }
    }

    // 5. Point-in-Polygon Administrative Boundary Check
    const region = this.classifyCoordinates(latitude, longitude);

    if (region === 'OUTSIDE_SEMARANG' || region === 'UNKNOWN') {
      return {
        allowed: false,
        region: 'OUTSIDE_SEMARANG',
        locationStatus: 'LOCATION_OUTSIDE',
        locationVerified: false,
        reason: 'Lokasi Anda berada di luar wilayah Kota dan Kabupaten Semarang. NIVA Stranger Chat dan Stranger Cam saat ini hanya tersedia di Kota dan Kabupaten Semarang.',
        riskScore,
        accuracy,
        boundaryVersion: this.DATASET_VERSION,
      };
    }

    // 6. Record Valid Ephemeral Fix in Memory
    ephemeralFixCache.set(cacheKey, {
      latitude,
      longitude,
      timestamp: coordTime,
    });
    ephemeralFixCache.set(userId, {
      latitude,
      longitude,
      timestamp: coordTime,
    });

    // 7. Persist to Database (Ephemeral location_verifications & location_confirmations)
    const db = getDatabase();
    const verificationId = uuidv4();
    const expiresAt = new Date(now + LOCATION_VERIFICATION_WINDOW_MINUTES * 60 * 1000).toISOString();

    try {
      // Ensure user exists in users table to satisfy foreign key constraint
      const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
      if (!existingUser) {
        db.prepare(`
          INSERT INTO users (id, telegram_id, status, is_18_plus, verification_status, subscription_status, created_at, updated_at)
          VALUES (?, ?, 'ACTIVE', 1, 'UNVERIFIED', 'FREE', datetime('now'), datetime('now'))
        `).run(userId, `stranger_${uuidv4().substring(0, 12)}`);
      }

      // Ephemeral verification log
      db.prepare(`
        INSERT INTO location_verifications (
          id, user_id, session_id, location_status, region, accuracy, risk_score, verified_at, expires_at
        ) VALUES (?, ?, ?, 'LOCATION_VERIFIED', ?, ?, ?, datetime('now'), ?)
      `).run(
        verificationId,
        userId,
        sessionId || null,
        region,
        accuracy || null,
        riskScore,
        expiresAt
      );

      // Upsert into location_confirmations for matchmaking eligibility
      db.prepare(`
        INSERT INTO location_confirmations (
          user_id, region, method, confirmed_at, expires_at, location_status, accuracy, risk_score, session_id
        ) VALUES (?, ?, 'BROWSER_GEO', datetime('now'), ?, 'LOCATION_VERIFIED', ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          region = excluded.region,
          method = 'BROWSER_GEO',
          confirmed_at = datetime('now'),
          expires_at = excluded.expires_at,
          location_status = 'LOCATION_VERIFIED',
          accuracy = excluded.accuracy,
          risk_score = excluded.risk_score,
          session_id = excluded.session_id
      `).run(userId, region, expiresAt, accuracy || null, riskScore, sessionId || null);
    } catch (dbErr) {
      console.error('Error persisting location verification:', dbErr);
    }

    return {
      allowed: true,
      region,
      locationStatus: 'LOCATION_VERIFIED',
      locationVerified: true,
      expiresAt,
      riskScore,
      accuracy,
      boundaryVersion: this.DATASET_VERSION,
    };
  }

  /**
   * Check whether a user has a current, verified, and fresh location in Kota or Kabupaten Semarang.
   */
  public static isUserLocationFresh(userId: string): {
    verified: boolean;
    region?: SemarangRegion;
    locationStatus: LocationStatus;
    reason?: string;
  } {
    const db = getDatabase();

    const record = db.prepare(`
      SELECT region, location_status, confirmed_at, expires_at
      FROM location_confirmations
      WHERE user_id = ?
    `).get(userId) as {
      region: string;
      location_status?: string;
      confirmed_at: string;
      expires_at: string;
    } | undefined;

    if (!record) {
      return {
        verified: false,
        locationStatus: 'LOCATION_REQUIRED',
        reason: 'Izin dan konfirmasi lokasi Semarang diperlukan sebelum bergabung.',
      };
    }

    // Check expiration
    const expiryTime = new Date(record.expires_at.replace(' ', 'T') + 'Z').getTime();
    if (Date.now() > expiryTime) {
      return {
        verified: false,
        locationStatus: 'LOCATION_STALE',
        reason: 'Verifikasi lokasi Anda telah kedaluwarsa. Silakan perbarui lokasi untuk melanjutkan.',
      };
    }

    const region = record.region as SemarangRegion;
    if (region !== 'CITY_SEMARANG' && region !== 'REGENCY_SEMARANG') {
      return {
        verified: false,
        region,
        locationStatus: 'LOCATION_OUTSIDE',
        reason: 'Lokasi Anda berada di luar area yang diizinkan (Kota atau Kabupaten Semarang).',
      };
    }

    return {
      verified: true,
      region,
      locationStatus: 'LOCATION_VERIFIED',
    };
  }

  /**
   * Clear in-memory fix cache (useful for testing)
   */
  public static clearCache(): void {
    ephemeralFixCache.clear();
  }
}
