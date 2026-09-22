import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabase, initDatabase } from '../src/database/db';
import { ContentModerationPipeline, REDACTED_MESSAGE_NOTICE } from '../src/services/safety/contentModerationPipeline';
import { StrikeService } from '../src/services/safety/strikeService';
import { StrangerChatService } from '../src/services/stranger/strangerChatService';
import { StrangerCamService } from '../src/services/stranger/strangerCamService';

const TEST_DB_PATH = path.resolve(process.cwd(), 'stranger_chat_test.db');
process.env.DATABASE_PATH = TEST_DB_PATH;

describe('NIVA Stranger Chat — Production-Grade Safety & Anti-Scam System', () => {
  before(() => {
    process.env.DATABASE_PATH = TEST_DB_PATH;
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch {}
    }
    initDatabase(TEST_DB_PATH);
  });

  after(() => {
    const db = getDatabase();
    try {
      db.close();
    } catch {}
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
    }
  });

  describe('1. Indonesian Phone Number Detection & Evasion Bypasses', () => {
    const testCases = [
      { text: 'Nomorku +6282312345678 ya', desc: 'Standard +62 format' },
      { text: 'Hubungi +62 823 1234 5678', desc: 'Spaced +62 format' },
      { text: 'Kontak +62-823-1234-5678', desc: 'Dashed +62 format' },
      { text: 'Nomorku 082312345678', desc: 'Standard 08 format' },
      { text: 'Chat ke 0823 1234 5678 ya', desc: 'Spaced 08 format' },
      { text: 'Nih 0823-1234-5678', desc: 'Dashed 08 format' },
      { text: 'Save 6282312345678', desc: 'Direct 628 format' },
      { text: 'Nomor 62 823 1234 5678', desc: 'Spaced 62 823 format' },
      { text: '0 8 2 3 1 2 3 4 5 6 7 8', desc: 'Heavily spaced digit evasion' },
      { text: '0.8.2.3.1.2.3.4.5.6.7.8', desc: 'Dotted digit evasion' },
      { text: '08_23_12_34_56_78', desc: 'Underscore digit evasion' },
      { text: '+6 2 8 2 3 1 2 3 4 5 6 7', desc: 'Spaced prefix evasion' },
      { text: 'nol delapan dua tiga satu dua tiga empat lima enam tujuh delapan', desc: 'Spelled out Indonesian digits' },
    ];

    for (const tc of testCases) {
      it(`should detect phone evasion: ${tc.desc} (${tc.text.substring(0, 25)}...)`, () => {
        const result = ContentModerationPipeline.evaluate(tc.text);
        assert.strictEqual(result.action, 'REDACT', `Expected REDACT for: ${tc.text}`);
        assert.strictEqual(result.category, 'PHONE_NUMBER');
        assert.ok(result.riskScore >= 70, `Expected risk score >= 70, got ${result.riskScore}`);
        assert.strictEqual(result.redactedContent, REDACTED_MESSAGE_NOTICE);
      });
    }
  });

  describe('2. False Positive Prevention for Normal Everyday Messages', () => {
    const normalCases = [
      'Nomor rumah saya 12.',
      'Besok jam 8 ya kita kumpul di perpus.',
      'Ada 2 orang temanku yang ikut.',
      'Filmnya bagus banget, aku suka.',
      'Saya suka Instagram reels yang lucu-lucu.',
      'Harga bukunya sekitar 50000 rupiah.',
      'Kuliah di UNDIP jurusan teknik informatika semester 4.',
      '0823 adalah contoh prefix Telkomsel di Indonesia.',
    ];

    for (const text of normalCases) {
      it(`should ALLOW normal non-violating message: "${text}"`, () => {
        const result = ContentModerationPipeline.evaluate(text);
        assert.strictEqual(result.allowed, true, `Expected allowed for: "${text}", got action ${result.action}`);
        assert.ok(result.riskScore <= 20, `Risk score should be <= 20, got ${result.riskScore}`);
      });
    }
  });

  describe('3. Obfuscated Scam & Gambling Detection (S1OT G4C0R, Homoglyphs)', () => {
    const scamCases = [
      { text: 'S1OT G4C0R hari ini modal receh', flags: 'Leetspeak slot gacor' },
      { text: 'S.I.O.T  G.A.C.O.R anti rungkat', flags: 'Dotted & spaced SIOT' },
      { text: 'S I O T  gacor maxwin pragmatic', flags: 'Spaced letters S I O T' },
      { text: 'S1 0T deposit dana tanpa potongan', flags: 'Alphanumeric split' },
      { text: 'g 4 c 0 r abis bosku', flags: 'Spaced g4c0r' },
      { text: 'investasi cuan profit harian pasti untung', flags: 'Financial pyramid' },
      { text: 'pinjam uang 500rb dong darurat', flags: 'Loan request' },
      { text: 'minta saldo dana 50rb buat makan', flags: 'Balance request' },
      { text: 'nomor rekening bca 1234567890 atas nama rudi', flags: 'Bank account sharing' },
    ];

    for (const tc of scamCases) {
      it(`should detect obfuscated financial scam: ${tc.flags}`, () => {
        const result = ContentModerationPipeline.evaluate(tc.text);
        assert.strictEqual(result.category, 'FINANCIAL_SCAM');
        assert.ok(result.riskScore >= 70, `Expected risk score >= 70, got ${result.riskScore}`);
        assert.ok(result.action === 'REDACT' || result.action === 'BLOCK_MESSAGE');
      });
    }
  });

  describe('4. Contextual External Contact & Handle Detection', () => {
    it('allows casual mention: "Aku suka main Instagram"', () => {
      const res = ContentModerationPipeline.evaluate('Aku suka main Instagram');
      assert.strictEqual(res.allowed, true);
    });

    it('redacts explicit IG handle sharing: "IG gue @anisa_cantik23 follow ya"', () => {
      const res = ContentModerationPipeline.evaluate('IG gue @anisa_cantik23 follow ya');
      assert.strictEqual(res.action, 'REDACT');
      assert.strictEqual(res.category, 'EXTERNAL_CONTACT');
      assert.ok(res.flags.some((f) => f.includes('INSTAGRAM') || f.includes('HANDLE')));
    });

    it('redacts WhatsApp contact sharing intent: "chat aku di WA ya 08..."', () => {
      const res = ContentModerationPipeline.evaluate('chat aku di WA ya 08123456789');
      assert.strictEqual(res.action, 'REDACT');
      assert.ok(res.category === 'PHONE_NUMBER' || res.category === 'EXTERNAL_CONTACT');
    });

    it('redacts Telegram handle: "add tele aku @dika_semarang"', () => {
      const res = ContentModerationPipeline.evaluate('add tele aku @dika_semarang');
      assert.strictEqual(res.action, 'REDACT');
      assert.strictEqual(res.category, 'EXTERNAL_CONTACT');
    });

    it('redacts Email address: "kirim ke emailku dinasari@gmail.com"', () => {
      const res = ContentModerationPipeline.evaluate('kirim ke emailku dinasari@gmail.com');
      assert.strictEqual(res.action, 'REDACT');
      assert.strictEqual(res.category, 'EXTERNAL_CONTACT');
    });
  });

  describe('5. Strict URL Blocking', () => {
    it('blocks raw URL: https://niva-fake-verify.xyz/login', () => {
      const res = ContentModerationPipeline.evaluate('buka link ini https://niva-fake-verify.xyz/login');
      assert.strictEqual(res.category, 'PHISHING_URL');
      assert.ok(res.action === 'REDACT' || res.action === 'BLOCK_MESSAGE');
    });

    it('blocks shortened URL: bit.ly/cuan-gratis', () => {
      const res = ContentModerationPipeline.evaluate('klik bit.ly/cuan-gratis');
      assert.strictEqual(res.category, 'PHISHING_URL');
      assert.ok(res.action === 'REDACT' || res.action === 'BLOCK_MESSAGE');
    });

    it('blocks IP-based URL: 103.24.12.5/klaim', () => {
      const res = ContentModerationPipeline.evaluate('cek di 103.24.12.5/klaim');
      assert.strictEqual(res.category, 'PHISHING_URL');
    });
  });

  describe('6. Cross-Message Temporal Sequence Accumulation (Split Bypasses)', () => {
    const sessionId = 'test-session-cross-msg';
    const senderId = 'user-spitter-01';

    before(() => {
      ContentModerationPipeline.clearTemporalWindow(sessionId);
    });

    it('catches phone number split across 4 consecutive messages', () => {
      // Message 1: "nomorku"
      const res1 = ContentModerationPipeline.evaluate('nomorku', sessionId, senderId);
      assert.strictEqual(res1.allowed, true);

      // Message 2: "08"
      const res2 = ContentModerationPipeline.evaluate('08', sessionId, senderId);
      assert.strictEqual(res2.allowed, true);

      // Message 3: "231"
      const res3 = ContentModerationPipeline.evaluate('231', sessionId, senderId);
      assert.strictEqual(res3.allowed, true);

      // Message 4: "2345678" -> Concatenated sequence reveals 082312345678!
      const res4 = ContentModerationPipeline.evaluate('2345678', sessionId, senderId);
      assert.strictEqual(res4.action, 'REDACT');
      assert.strictEqual(res4.category, 'PHONE_NUMBER');
      assert.ok(res4.flags.includes('CROSS_MESSAGE_PHONE_SPLIT_EVASION'));
    });
  });

  describe('7. Three-Strike Escalation System', () => {
    const testUserId = 'test-strike-user-01';

    before(() => {
      StrangerCamService.getOrCreateStrangerUser({ userId: testUserId, is18Plus: true });
    });

    it('Strike 1: First violation issues WARNING', () => {
      const outcome = StrikeService.recordViolation({
        userId: testUserId,
        category: 'EXTERNAL_CONTACT',
        severity: 'MEDIUM',
        action: 'REDACT',
        riskScore: 60,
        evidenceSnippet: 'IG: @user_violator_1',
      });

      assert.strictEqual(outcome.newStrikeCount, 1);
      assert.strictEqual(outcome.restrictionApplied, 'WARNING');

      const restriction = StrikeService.getUserRestriction(testUserId);
      assert.strictEqual(restriction.isRestricted, false);
      assert.strictEqual(restriction.activeStrikes, 1);
      assert.strictEqual(restriction.restrictionType, 'WARNING');
    });

    it('Strike 2: Second violation issues TEMP_RESTRICT (15-min cooldown)', () => {
      const outcome = StrikeService.recordViolation({
        userId: testUserId,
        category: 'PHONE_NUMBER',
        severity: 'HIGH',
        action: 'REDACT',
        riskScore: 75,
        evidenceSnippet: 'Nomor: 081234567890',
      });

      assert.strictEqual(outcome.newStrikeCount, 2);
      assert.strictEqual(outcome.restrictionApplied, 'TEMP_RESTRICT');
      assert.ok(outcome.restrictedUntil, 'Restricted until must be set for strike 2');

      const restriction = StrikeService.getUserRestriction(testUserId);
      assert.strictEqual(restriction.isRestricted, true);
      assert.strictEqual(restriction.activeStrikes, 2);
      assert.strictEqual(restriction.restrictionType, 'TEMP_RESTRICT');
    });

    it('Strike 3: Third violation triggers BANNED / ACCOUNT_BLOCK', () => {
      const outcome = StrikeService.recordViolation({
        userId: testUserId,
        category: 'FINANCIAL_SCAM',
        severity: 'HIGH',
        action: 'BLOCK_MESSAGE',
        riskScore: 85,
        evidenceSnippet: 'Transfer uang ke slot gacor',
      });

      assert.strictEqual(outcome.newStrikeCount, 3);
      assert.strictEqual(outcome.restrictionApplied, 'BANNED');

      const restriction = StrikeService.getUserRestriction(testUserId);
      assert.strictEqual(restriction.isRestricted, true);
      assert.strictEqual(restriction.activeStrikes, 3);
      assert.strictEqual(restriction.restrictionType, 'BANNED');
    });
  });

  describe('8. Critical Violation Immediate Enforcement (Bypasses 3-Strikes)', () => {
    const criticalUserId = 'test-critical-offender-01';

    before(() => {
      StrangerCamService.getOrCreateStrangerUser({ userId: criticalUserId, is18Plus: true });
    });

    it('immediately bans user on first strike for sextortion / blackmail', () => {
      // User has 0 prior strikes
      assert.strictEqual(StrikeService.getActiveStrikeCount(criticalUserId), 0);

      const msg = 'transfer uang 5 juta atau video syur kamu saya sebar ke teman kampusmu';
      const mod = ContentModerationPipeline.evaluate(msg);

      assert.strictEqual(mod.immediateActionRequired, true);
      assert.strictEqual(mod.severity, 'CRITICAL');
      assert.strictEqual(mod.category, 'DANGEROUS_CONTENT');

      const outcome = StrikeService.recordViolation({
        userId: criticalUserId,
        category: mod.category!,
        severity: mod.severity,
        action: mod.action,
        riskScore: mod.riskScore,
        evidenceSnippet: msg,
        immediateCritical: mod.immediateActionRequired,
      });

      // Immediately BANNED on first event!
      assert.strictEqual(outcome.restrictionApplied, 'BANNED');

      const restriction = StrikeService.getUserRestriction(criticalUserId);
      assert.strictEqual(restriction.isRestricted, true);
      assert.strictEqual(restriction.restrictionType, 'BANNED');
    });
  });

  describe('9. Stranger Chat End-to-End Session, Messaging & Redaction', () => {
    const userA = 'stranger_user_alice';
    const userB = 'stranger_user_bob';

    before(() => {
      // Setup both users as 18+ and confirmed Semarang
      StrangerCamService.getOrCreateStrangerUser({ userId: userA, is18Plus: true });
      StrangerCamService.confirmSemarangLocation(userA, 'USER_CONFIRMATION');

      StrangerCamService.getOrCreateStrangerUser({ userId: userB, is18Plus: true });
      StrangerCamService.confirmSemarangLocation(userB, 'USER_CONFIRMATION');
    });

    let activeSessionId: string;

    it('pairs user A and user B anonymously in 1-on-1 text chat', () => {
      // User A enters queue
      const qA = StrangerChatService.enterQueue(userA);
      assert.strictEqual(qA.matched, false);
      assert.strictEqual(qA.status, 'QUEUED');

      // User B enters queue -> Match should occur!
      const qB = StrangerChatService.enterQueue(userB);
      assert.strictEqual(qB.matched, true);
      assert.strictEqual(qB.status, 'CONNECTED');
      assert.ok(qB.sessionId);
      assert.strictEqual(qB.partnerAlias, 'Stranger');

      activeSessionId = qB.sessionId!;
    });

    it('delivers normal clean message from Alice to Bob', () => {
      const sendRes = StrangerChatService.sendMessage(activeSessionId, userA, 'Halo salam kenal dari Undip!');
      assert.strictEqual(sendRes.success, true);
      assert.strictEqual(sendRes.isRedacted, false);
      assert.strictEqual(sendRes.deliveredContent, 'Halo salam kenal dari Undip!');

      const messages = StrangerChatService.getMessages(activeSessionId, userB);
      assert.strictEqual(messages.length, 1);
      assert.strictEqual(messages[0].content, 'Halo salam kenal dari Undip!');
    });

    it('redacts message when Bob attempts to share phone number', () => {
      const sendRes = StrangerChatService.sendMessage(activeSessionId, userB, 'Ini nomor WhatsAppku: 082312345678 ya');
      assert.strictEqual(sendRes.success, true);
      assert.strictEqual(sendRes.isRedacted, true);
      assert.strictEqual(sendRes.deliveredContent, REDACTED_MESSAGE_NOTICE);

      // Verify Bob received strike
      const restriction = StrikeService.getUserRestriction(userB);
      assert.strictEqual(restriction.activeStrikes, 1);

      // Verify Alice receives only the redacted notice
      const messages = StrangerChatService.getMessages(activeSessionId, userA);
      const lastMsg = messages[messages.length - 1];
      assert.strictEqual(lastMsg.content, REDACTED_MESSAGE_NOTICE);
      assert.strictEqual(lastMsg.isRedacted, true);
    });

    it('rejects message sent by unauthorized third party', () => {
      assert.throws(
        () => {
          StrangerChatService.sendMessage(activeSessionId, 'intruder_user_charlie', 'Hacked message');
        },
        /otorisasi/i
      );
    });

    it('rejects message exceeding 500 characters', () => {
      const longText = 'a'.repeat(550);
      assert.throws(
        () => {
          StrangerChatService.sendMessage(activeSessionId, userA, longText);
        },
        /melebihi batas maksimal/i
      );
    });

    it('allows Alice to skip Bob and cleans up session', () => {
      const skipRes = StrangerChatService.skip(activeSessionId, userA);
      assert.strictEqual(skipRes.success, true);

      // Verify active session ended
      const active = StrangerChatService.getActiveSession(userA);
      assert.strictEqual(active, null);
    });

    it('allows Alice to block Bob and excludes them from future matchmaking', () => {
      // Re-enter queue for testing block
      const qA = StrangerChatService.enterQueue(userA);
      const qB = StrangerChatService.enterQueue(userB);
      assert.strictEqual(qB.matched, true);

      const blockRes = StrangerChatService.block(qB.sessionId!, userA, 'Spam behavior');
      assert.strictEqual(blockRes.success, true);

      // Now enter queue again: Alice and Bob must NOT match due to block exclusion
      const qA2 = StrangerChatService.enterQueue(userA);
      const qB2 = StrangerChatService.enterQueue(userB);

      // Neither should match with the other
      assert.strictEqual(qA2.matched, false);
      assert.strictEqual(qB2.matched, false);

      // Cleanup queues
      StrangerChatService.leaveQueue(userA);
      StrangerChatService.leaveQueue(userB);
    });
  });

  describe('10. Admin Moderation Queue & False Positive Dismissal', () => {
    it('retrieves queue sorted by severity', () => {
      const queue = StrikeService.getModerationQueue();
      assert.ok(Array.isArray(queue));
      assert.ok(queue.length > 0);

      // Critical should appear first
      if (queue.some((e) => e.severity === 'CRITICAL')) {
        assert.strictEqual(queue[0].severity, 'CRITICAL');
      }
    });

    it('allows admin to dismiss a false positive and decrements strikes', () => {
      const userId = 'user_fp_test';
      StrangerCamService.getOrCreateStrangerUser({ userId, is18Plus: true });

      const eventOutcome = StrikeService.recordViolation({
        userId,
        category: 'EXTERNAL_CONTACT',
        severity: 'LOW',
        action: 'WARN',
        riskScore: 35,
        evidenceSnippet: 'False positive test',
      });

      assert.strictEqual(StrikeService.getActiveStrikeCount(userId), 1);

      // Dismiss event
      const dismissRes = StrikeService.resolveEvent(
        eventOutcome.event.id,
        'moderator_admin_01',
        'DISMISS',
        'Verified as false positive'
      );
      assert.strictEqual(dismissRes.success, true);

      // Strike count should now be 0
      assert.strictEqual(StrikeService.getActiveStrikeCount(userId), 0);
    });
  });
});
