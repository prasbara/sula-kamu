/**
 * ContentModerationPipeline — Production-Grade Safety & Anti-Scam System
 *
 * Core Principles:
 *  1. Server-Authoritative: Every enforcement decision is made server-side.
 *  2. Multi-Layer Detection: Unicode NFKC -> Confusables -> Delimiters -> Pattern Matching -> Contextual Intent.
 *  3. Indonesian Phone Number Protection: Detects all +62/08 variations and delimiter evasions.
 *  4. Obfuscation & Evasion Resistance: Handles spaced letters, leetspeak, homoglyphs (e.g. S1OT G4C0R, 0 8 1 2...).
 *  5. Contextual Intent Filtering: Distinguishes casual mentions from external contact transfers.
 *  6. Cross-Message Temporal Sequence Accumulation: Catches split-message evasion across temporal window.
 *  7. Data Minimization: Redaction without partial exposure. No permanent raw chat storage.
 */

import {
  ContentModerationResult,
  ModerationAction,
  ModerationCategory,
  ModerationSeverity,
} from '../../types/index';

// ─── Constants ────────────────────────────────────────────────────────────────

export const REDACTED_MESSAGE_NOTICE = '[Pesan disensor oleh sistem keamanan NIVA]';

// Maximum message characters
export const MAX_MESSAGE_LENGTH = 500;
export const MAX_MESSAGES_PER_MINUTE = 15;

// Unicode Homoglyph & Confusable Replacement Map
const HOMOGLYPH_MAP: Record<string, string> = {
  // Cyrillic to Latin
  '\u0430': 'a', '\u0410': 'A', '\u0431': 'b', '\u0432': 'b', '\u0412': 'B',
  '\u0435': 'e', '\u0415': 'E', '\u043A': 'k', '\u041A': 'K', '\u043C': 'm',
  '\u041C': 'M', '\u043D': 'h', '\u041D': 'H', '\u043E': 'o', '\u041E': 'O',
  '\u0440': 'p', '\u0420': 'P', '\u0441': 'c', '\u0421': 'C', '\u0442': 't',
  '\u0422': 'T', '\u0443': 'y', '\u0423': 'Y', '\u0445': 'x', '\u0425': 'X',
  '\u0456': 'i', '\u0406': 'I', '\u04CF': 'l', '\u0458': 'j',
  // Greek to Latin
  '\u03B1': 'a', '\u03B2': 'b', '\u03B3': 'y', '\u03B5': 'e', '\u03B9': 'i',
  '\u03BA': 'k', '\u03BD': 'v', '\u03BF': 'o', '\u03C1': 'p', '\u03C4': 't',
  '\u03C5': 'u', '\u03C7': 'x',
};

// Spelled-out Indonesian digits for phonetic evasion
const SPELLED_DIGITS: [RegExp, string][] = [
  [/\b(nol|kosong)\b/gi, '0'],
  [/\b(satu)\b/gi, '1'],
  [/\b(dua)\b/gi, '2'],
  [/\b(tiga)\b/gi, '3'],
  [/\b(empat)\b/gi, '4'],
  [/\b(lima)\b/gi, '5'],
  [/\b(enam)\b/gi, '6'],
  [/\b(tujuh)\b/gi, '7'],
  [/\b(delapan)\b/gi, '8'],
  [/\b(sembilan)\b/gi, '9'],
];

// Shortened URL domains
const SHORTENED_DOMAINS = [
  'bit.ly', 'tinyurl.com', 's.id', 't.co', 'cutt.ly', 'is.gd', 'rb.gy',
  'rebrand.ly', 'shorturl.at', 'gg.gg', 'wa.link',
];

// Common TLDs for raw domain detection
const COMMON_TLDS = '(?:com|id|co\\.id|net|org|xyz|site|online|vip|club|top|click|app|io|dev|link|me|tv|shop)';

// In-memory temporal window accumulator for split messages (session_id + sender_id -> message history)
interface RecentMessage {
  content: string;
  timestamp: number;
}
const temporalMessageWindows = new Map<string, RecentMessage[]>();

// ─── ContentModerationPipeline Class ──────────────────────────────────────────

export class ContentModerationPipeline {
  /**
   * Reset temporal window (for testing or session termination)
   */
  public static clearTemporalWindow(sessionId: string, senderId?: string): void {
    if (senderId) {
      temporalMessageWindows.delete(`${sessionId}:${senderId}`);
    } else {
      for (const key of temporalMessageWindows.keys()) {
        if (key.startsWith(`${sessionId}:`)) {
          temporalMessageWindows.delete(key);
        }
      }
    }
  }

  /**
   * Main server-side moderation entry point
   */
  public static evaluate(
    content: string,
    sessionId?: string,
    senderId?: string
  ): ContentModerationResult {
    // 1. Input Validation
    if (!content || typeof content !== 'string') {
      return {
        allowed: false,
        action: 'BLOCK_MESSAGE',
        severity: 'LOW',
        category: 'OTHER',
        riskScore: 50,
        flags: ['EMPTY_CONTENT'],
        warningMessage: 'Pesan tidak boleh kosong.',
      };
    }

    const trimmed = content.trim();
    if (trimmed.length === 0) {
      return {
        allowed: false,
        action: 'BLOCK_MESSAGE',
        severity: 'LOW',
        category: 'OTHER',
        riskScore: 50,
        flags: ['WHITESPACE_ONLY'],
        warningMessage: 'Pesan tidak boleh hanya berisi spasi.',
      };
    }

    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      return {
        allowed: false,
        action: 'BLOCK_MESSAGE',
        severity: 'MEDIUM',
        category: 'SPAM_FLOODING',
        riskScore: 60,
        flags: ['MESSAGE_TOO_LONG'],
        warningMessage: `Pesan melebihi batas maksimal ${MAX_MESSAGE_LENGTH} karakter.`,
      };
    }

    // 2. Normalization Steps
    const normalizedNfkc = trimmed.normalize('NFKC');
    // Strip zero-width and invisible characters
    const cleanUnicode = normalizedNfkc.replace(/[\u200B-\u200D\uFEFF\u2060-\u2064\u00AD]/g, '');

    // Map homoglyphs / confusables
    let unconfused = '';
    for (const char of cleanUnicode) {
      unconfused += HOMOGLYPH_MAP[char] || char;
    }

    // Leetspeak translation shadow for keyword detection
    const leetShadow = this.createLeetShadow(unconfused);

    // Separator collapsed string for evasion detection
    const collapsedShadow = this.createCollapsedShadow(unconfused);

    // 3. Evaluate Single Message Detections
    const flags: string[] = [];
    let detectedCategory: ModerationCategory | null = null;
    let maxSeverity: ModerationSeverity = 'LOW';
    let riskScore = 0;

    // A. Dangerous Content & Critical Violations (Highest Priority)
    const dangerousCheck = this.detectDangerousContent(unconfused, leetShadow);
    if (dangerousCheck.detected) {
      return {
        allowed: false,
        action: dangerousCheck.isImmediateCritical ? 'ACCOUNT_BLOCK' : 'BLOCK_MESSAGE',
        severity: dangerousCheck.severity,
        category: 'DANGEROUS_CONTENT',
        riskScore: dangerousCheck.riskScore,
        flags: dangerousCheck.flags,
        warningMessage: 'Pesan diblokir karena melanggar kebijakan keamanan kritis NIVA.',
        immediateActionRequired: dangerousCheck.isImmediateCritical,
        strikeEscalation: true,
      };
    }

    // B. Strict URL & Phishing Link Detection
    const urlCheck = this.detectUrls(unconfused);
    if (urlCheck.detected) {
      flags.push(...urlCheck.flags);
      detectedCategory = 'PHISHING_URL';
      maxSeverity = 'HIGH';
      riskScore = Math.max(riskScore, 75);
    }

    // C. Indonesian Phone Number Detection
    const phoneCheck = this.detectIndonesianPhone(unconfused, collapsedShadow);
    if (phoneCheck.detected) {
      flags.push(...phoneCheck.flags);
      detectedCategory = 'PHONE_NUMBER';
      maxSeverity = 'HIGH';
      riskScore = Math.max(riskScore, 70);
    }

    // D. External Contact / Social Handle Detection (Context-Aware)
    const contactCheck = this.detectExternalContact(unconfused, leetShadow);
    if (contactCheck.detected) {
      flags.push(...contactCheck.flags);
      detectedCategory = detectedCategory || 'EXTERNAL_CONTACT';
      maxSeverity = 'HIGH';
      riskScore = Math.max(riskScore, 65);
    }

    // E. Anti-Scam Detection (Financial, Credential Theft, Romance Scam)
    const scamCheck = this.detectScamPatterns(unconfused, leetShadow, collapsedShadow);
    if (scamCheck.detected) {
      flags.push(...scamCheck.flags);
      detectedCategory = detectedCategory || scamCheck.category;
      if (scamCheck.severity === 'CRITICAL' || (maxSeverity as string) !== 'CRITICAL') {
        maxSeverity = scamCheck.severity;
      }
      riskScore = Math.max(riskScore, scamCheck.riskScore);
    }

    // 4. Cross-Message Temporal Sequence Accumulation (Split-Message Evasion)
    if (sessionId && senderId && riskScore < 70) {
      const crossMessageCheck = this.checkCrossMessageEvasion(
        sessionId,
        senderId,
        unconfused
      );
      if (crossMessageCheck.detected) {
        flags.push(...crossMessageCheck.flags);
        detectedCategory = detectedCategory || crossMessageCheck.category;
        maxSeverity = 'HIGH';
        riskScore = Math.max(riskScore, 70);
      }
    }

    // 5. Policy Engine & Action Decision
    let action: ModerationAction = 'ALLOW';
    let warningMessage: string | undefined;

    if (riskScore >= 91) {
      action = 'ACCOUNT_BLOCK';
      warningMessage = 'Aktivitas akun Anda dibatasi karena pelanggaran berat.';
    } else if (riskScore >= 71) {
      action = 'BLOCK_MESSAGE';
      warningMessage = 'Pesan diblokir karena berpotensi melanggar ketentuan keamanan NIVA.';
    } else if (riskScore >= 41) {
      action = 'REDACT';
      warningMessage = 'Pesan disensor karena mengandung informasi kontak/tautan yang dilarang di Stranger Chat.';
    } else if (riskScore >= 21) {
      action = 'WARN';
      warningMessage = 'Perhatian: Tetap waspada terhadap pertukaran informasi sensitif.';
    }

    // Record to temporal window if allowed or redacted (so subsequent messages can still detect sequences)
    if (sessionId && senderId && riskScore < 90) {
      this.recordToTemporalWindow(sessionId, senderId, unconfused);
    }

    return {
      allowed: action === 'ALLOW' || action === 'WARN',
      action,
      severity: maxSeverity,
      category: detectedCategory,
      riskScore,
      flags,
      redactedContent: action === 'REDACT' ? REDACTED_MESSAGE_NOTICE : undefined,
      warningMessage,
      strikeEscalation: riskScore >= 41,
      immediateActionRequired: riskScore >= 91,
    };
  }

  // ─── Detection Subsystems ───────────────────────────────────────────────────

  /**
   * Indonesian Phone Number Detection with Delimiter & Obfuscation Resistance.
   * Recognizes +62, 62, 08 prefixes, spelled out numbers, and spaced/dotted digits.
   * Prevents false positives on normal small numbers ("Nomor rumah 12", "Jam 8", "50000").
   */
  public static detectIndonesianPhone(text: string, collapsed: string): { detected: boolean; flags: string[] } {
    const flags: string[] = [];

    // 1. Spelled out numbers conversion to digits check
    let spelledReplaced = text.toLowerCase();
    for (const [regex, digit] of SPELLED_DIGITS) {
      spelledReplaced = spelledReplaced.replace(regex, digit);
    }
    const spelledCollapsed = spelledReplaced.replace(/[\s._\-*]+/g, '');
    if (/(?:^|\D)(?:08|628)\d{8,12}(?:\D|$)/.test(spelledCollapsed)) {
      flags.push('PHONE_SPELLED_OUT_EVASION');
      return { detected: true, flags };
    }

    // 2. Direct Indonesian mobile pattern in raw text:
    // Matches formats like: +6282312345678, +62 823-1234-5678, 0823 1234 5678, 0823-1234-5678, etc.
    const directPhonePattern = /(?:^|\D)(?:\+?62[\s._\-]*|0)8[0-9\s._\-*]{8,18}(?:\D|$)/i;
    const match = text.match(directPhonePattern);
    if (match) {
      // Validate that extracted digits genuinely constitute a valid 10-14 digit mobile number
      const digitsOnly = match[0].replace(/\D/g, '');
      if (
        (digitsOnly.startsWith('08') && digitsOnly.length >= 10 && digitsOnly.length <= 13) ||
        (digitsOnly.startsWith('628') && digitsOnly.length >= 11 && digitsOnly.length <= 14)
      ) {
        flags.push('PHONE_NUMBER_DETECTED');
        return { detected: true, flags };
      }
    }

    // 3. Evasion via heavily spaced/separated digits:
    // e.g. "0 8 1 2 3 4 5 6 7 8 9", "0.8.1.2.3.4.5.6.7.8.9", "0_8_1_2..."
    const cleanDigits = text.replace(/[^0-9]/g, '');
    if (cleanDigits.startsWith('08') && cleanDigits.length >= 10 && cleanDigits.length <= 13) {
      // Check if text was spaced out
      if (/\b0[\s._\-*]+8[\s._\-*]+[0-9]/.test(text)) {
        flags.push('PHONE_OBFUSCATION_SPACED');
        return { detected: true, flags };
      }
      // If the message is dominated by these digits
      if (cleanDigits.length / text.replace(/\s/g, '').length > 0.6) {
        flags.push('PHONE_DIGITS_DENSE');
        return { detected: true, flags };
      }
    } else if (cleanDigits.startsWith('628') && cleanDigits.length >= 11 && cleanDigits.length <= 14) {
      flags.push('PHONE_NUMBER_628');
      return { detected: true, flags };
    }

    // 4. Check collapsed shadow for hidden phone number sequences
    const collapsedMatch = collapsed.match(/(?:^|\D)(?:08|628)\d{8,11}(?:\D|$)/);
    if (collapsedMatch) {
      flags.push('PHONE_COLLAPSED_SEQUENCE');
      return { detected: true, flags };
    }

    return { detected: false, flags: [] };
  }

  /**
   * External Contact & Social Handle Detection.
   * Distinguishes conversational mentions ("Saya suka Instagram") from contact sharing ("IG gue @xxxx").
   */
  public static detectExternalContact(text: string, leetText: string): { detected: boolean; flags: string[] } {
    const flags: string[] = [];
    const lower = text.toLowerCase();

    // 1. Email address
    const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/i;
    if (emailPattern.test(text)) {
      flags.push('EMAIL_DETECTED');
      return { detected: true, flags };
    }

    // 2. WhatsApp intent patterns
    // e.g. "wa aku", "chat wa", "no wa", "wa.me/", "save wa"
    const waIntentPattern = /(?:\bwa\b|\bwhatsapp\b|\bwhats\s*app\b)[\s:=-]*(?:aku|gue|gw|saya|me|di|ke|nomor|no|chat|hubungi|\+?62|08|wa\.me)/i;
    const waDirectPattern = /(?:chat|hubungi|save|kontak|nomor|no)[\s:=-]*(?:aku|gue|gw|saya)?[\s:=-]*(?:di|ke)?[\s:=-]*(?:wa|whatsapp)/i;
    const waMePattern = /wa\.me\/[a-zA-Z0-9_-]+/i;
    if (waIntentPattern.test(lower) || waDirectPattern.test(lower) || waMePattern.test(lower)) {
      flags.push('WHATSAPP_CONTACT_INTENT');
      return { detected: true, flags };
    }

    // 3. Instagram intent patterns
    // e.g. "ig gue @xxxx", "ig: @xxxx", "follow ig: xxx", "instagram: @xxx"
    // NOT "Saya suka Instagram" or "Instagram down"
    const igFollowPattern = /(?:follow|add|cek|stalk|dm|chat)[\s:=-]*(?:di|ke)?[\s:=-]*(?:ig|instagram)[\s:=-]*[@]?[a-zA-Z0-9._]{3,30}\b/i;
    const igDirectMention = /(?:^|\s)@([a-zA-Z0-9._]{4,30})\b/i;

    // Check if IG mention has an explicit handle attached or sharing intent
    if (
      /(?:\big\b|\binstagram\b)[\s:=-]+[@]?[a-zA-Z0-9._]{3,30}/i.test(lower) &&
      !/(?:suka|pakai|buka|scroll|tentang|aplikasi)\s+instagram/i.test(lower)
    ) {
      flags.push('INSTAGRAM_HANDLE_INTENT');
      return { detected: true, flags };
    }

    if (igFollowPattern.test(lower)) {
      flags.push('INSTAGRAM_FOLLOW_INTENT');
      return { detected: true, flags };
    }

    // Lone @handle check (e.g. "@anisa_salma23")
    if (igDirectMention.test(text)) {
      // Allow benign system mentions if any, otherwise treat @handle as external contact attempt
      const handle = text.match(igDirectMention)?.[1] || '';
      if (handle.length >= 4 && !['everyone', 'here', 'channel', 'admin'].includes(handle.toLowerCase())) {
        flags.push('DIRECT_HANDLE_AT_SIGN');
        return { detected: true, flags };
      }
    }

    // 4. Telegram handle & link intent
    // e.g. "tele aku @xxx", "t.me/xxx", "chat di telegram"
    const telePattern = /(?:\btele\b|\btelegram\b)[\s:=-]*(?:aku|gue|gw|saya|me|di|ke|id)?[\s:=-]*[@]?[a-zA-Z0-9_]{5,32}\b/i;
    const tMePattern = /t\.me\/[a-zA-Z0-9_]{5,32}\b/i;
    if (telePattern.test(lower) || tMePattern.test(lower)) {
      flags.push('TELEGRAM_CONTACT_INTENT');
      return { detected: true, flags };
    }

    // 5. Discord tag (e.g. username#1234 or discord: username)
    const discordPattern = /(?:\bdiscord\b|\bdc\b)[\s:=-]*(?:id|aku|gue|gw|saya)?[\s:=-]*[a-zA-Z0-9_.-]+(?:#\d{4})?/i;
    if (discordPattern.test(lower) && /(?:id|add|add\s*me|chat|username|#\d{4})/i.test(lower)) {
      flags.push('DISCORD_CONTACT_INTENT');
      return { detected: true, flags };
    }

    // 6. Line ID (e.g. "id line: xxxxx")
    const linePattern = /(?:\bid\s*line\b|\bline\s*id\b|\bline\b[\s:=-]+(?:aku|gue|gw|saya|id)[\s:=-]+[a-zA-Z0-9._-]{4,20})/i;
    if (linePattern.test(lower)) {
      flags.push('LINE_CONTACT_INTENT');
      return { detected: true, flags };
    }

    // 7. Generic transfer communication off platform
    // "pindah ke wa", "chat di luar aja", "minta kontakmu"
    if (/(?:pindah|lanjut|chat|ngobrol)\s+(?:ke|di)\s+(?:wa|ig|tele|telegram|luar)/i.test(lower)) {
      flags.push('EXTERNAL_PLATFORM_REDIRECT');
      return { detected: true, flags };
    }

    return { detected: false, flags: [] };
  }

  /**
   * Strict URL Detection.
   * Section 17: Block all external URLs by default in Stranger Chat.
   */
  public static detectUrls(text: string): { detected: boolean; flags: string[] } {
    const flags: string[] = [];

    // Protocol based URL (http, https, ftp)
    if (/https?:\/\/[^\s]+/i.test(text)) {
      flags.push('RAW_EXTERNAL_URL');
      return { detected: true, flags };
    }

    // Shortened URL domains
    for (const domain of SHORTENED_DOMAINS) {
      if (new RegExp(`\\b${domain.replace('.', '\\.')}\\/[^\\s]+`, 'i').test(text)) {
        flags.push('SHORTENED_URL_DETECTED');
        return { detected: true, flags };
      }
    }

    // IP-based URL (e.g. 192.168.1.1, 103.25.1.10/login)
    // Negative lookbehind and lookahead on dots prevents false positive on dotted phone numbers (0.8.2.3.1.2...)
    if (/(?<!\.)\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(?!\.)(?::\d{2,5})?(?:\/[^\s]*)?\b/.test(text)) {
      flags.push('IP_BASED_URL');
      return { detected: true, flags };
    }

    // Ignore domain pattern if it is part of an email address
    const textWithoutEmails = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '');

    // Domain name with common TLD (e.g. "google.com", "bitly.co/login")
    const domainPattern = new RegExp(`\\b[a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)*\\.${COMMON_TLDS}(?:\\/[^\\s]*)?\\b`, 'i');
    if (domainPattern.test(textWithoutEmails)) {
      flags.push('DOMAIN_EXTERNAL_LINK');
      return { detected: true, flags };
    }

    return { detected: false, flags: [] };
  }

  /**
   * Scam Pattern Detection (Financial, Credential, Phishing, Romance).
   * Supports obfuscation resistance (S1OT G4C0R, S.I.O.T, leetspeak, collapsed).
   */
  public static detectScamPatterns(
    text: string,
    leetText: string,
    collapsed: string
  ): { detected: boolean; category: ModerationCategory; severity: ModerationSeverity; riskScore: number; flags: string[] } {
    const flags: string[] = [];
    const lower = text.toLowerCase();
    const leetLower = leetText.toLowerCase();
    const collapsedLower = collapsed.toLowerCase();

    // 1. Slot / Gambling / Financial Pyramid Evasion:
    // Matches: S1OT G4C0R, S.I.O.T, S I O T, S1 0T, g4c0r, slot gacor, maxwin, etc.
    const isSlotScam =
      /(?:slot|s1ot|s\.l\.o\.t|siot|s\s*1\s*0\s*t|s\s*1\s*o\s*t)\s*(?:gacor|g4c0r|g\.a\.c\.o\.r|maxwin|pragmatic|zeus|olympus|depo|deposit|wd)/i.test(lower) ||
      /(?:slot|s1ot)\s*(?:gacor|g4c0r)/i.test(leetLower) ||
      /slotgacor|s1otg4c0r|siotgacor|s10tdeposit/i.test(collapsedLower) ||
      /\b(?:gacor|g4c0r)\s*(?:hari\s*ini|modal\s*receh|anti\s*rungkat|abis|bosku)\b/i.test(lower) ||
      /\bg\s*4\s*c\s*0\s*r\b/i.test(lower) ||
      /\bg\s*a\s*c\s*o\s*r\b/i.test(lower) ||
      /\bs\s*1\s*0\s*t\b/i.test(lower);

    if (isSlotScam) {
      flags.push('FINANCIAL_SCAM_GAMBLING_SLOT');
      return {
        detected: true,
        category: 'FINANCIAL_SCAM',
        severity: 'HIGH',
        riskScore: 85,
        flags,
      };
    }

    // 2. Direct Financial Request / Loan / Transfer / Crypto scam:
    // e.g. "transfer uang", "minta saldo dana", "pinjam uang", "investasi cuan pasti", "kirim nomor rekening"
    const financialPatterns = [
      { pattern: /(?:transfer|tf|kirimkan?)\s+(?:uang|dana|duit|saldo|pulsa)/i, flag: 'MONEY_TRANSFER_REQUEST', score: 85 },
      { pattern: /(?:minta|bagi|mnta)\s+(?:saldo|dana|duit|uang|gopay|ovo)/i, flag: 'BALANCE_REQUEST', score: 80 },
      { pattern: /(?:pinjam|pinjem|minjem|pinjamkan)\s+(?:uang|saldo|duit|dana|cepet)/i, flag: 'LOAN_SOLICITATION', score: 75 },
      { pattern: /(?:investasi|trading|crypto)\s+(?:cuan|profit|harian|pasti|titip\s*dana)/i, flag: 'INVESTMENT_FRAUD', score: 85 },
      { pattern: /(?:biaya\s*admin|ongkir\s*hadiah|pajak\s*menang)/i, flag: 'ADVANCE_FEE_SCAM', score: 80 },
      { pattern: /(?:top\s*up|topup)\s+(?:saldo|dana|akun\s*saya)/i, flag: 'TOPUP_SOLICITATION', score: 75 },
      { pattern: /(?:nomor|no)\s*(?:rekening|rek)(?:\s+[a-zA-Z]+)?[\s:=-]+[0-9]{8,18}/i, flag: 'BANK_ACCOUNT_SHARING', score: 85 },
      { pattern: /(?:scan|kirim)\s*(?:qris|qr\s*code)/i, flag: 'QRIS_PAYMENT_REQUEST', score: 80 },
    ];

    for (const item of financialPatterns) {
      if (item.pattern.test(lower) || item.pattern.test(leetLower)) {
        flags.push(item.flag);
        return {
          detected: true,
          category: 'FINANCIAL_SCAM',
          severity: 'HIGH',
          riskScore: item.score,
          flags,
        };
      }
    }

    // 3. Credential Theft & Phishing (OTP, PIN, Password, Login link)
    const credentialPatterns = [
      { pattern: /(?:minta|kirim|sebutkan|bagi)\s*(?:otp|kode\s*otp|kode\s*verifikasi|pin|password|kata\s*sandi)/i, flag: 'CREDENTIAL_OTP_SOLICITATION', score: 95 },
      { pattern: /(?:jangan\s*beritahu\s*siapapun|kode\s*6\s*angka|sms\s*dari\s*whatsapp)/i, flag: 'OTP_EXTRACTION_PATTERN', score: 90 },
      { pattern: /(?:login|masuk)\s*(?:ulang|disini|melalui\s*link|ke\s*akun)/i, flag: 'CREDENTIAL_LOGIN_PHISHING', score: 85 },
      { pattern: /(?:reset|ganti)\s*(?:password|sandi|pin)\s*(?:kamu|anda)/i, flag: 'PASSWORD_RESET_PHISHING', score: 85 },
    ];

    for (const item of credentialPatterns) {
      if (item.pattern.test(lower) || item.pattern.test(leetLower)) {
        flags.push(item.flag);
        return {
          detected: true,
          category: 'CREDENTIAL_THEFT',
          severity: 'CRITICAL',
          riskScore: item.score,
          flags,
        };
      }
    }

    // 4. Romance Scam Patterns:
    // Rapid declarations + money / emergency requests
    if (
      /(?:sayang|cinta|bebe|honey|sweetheart).*(?:darurat|butuh\s*uang|bantu\s*biaya|bayar\s*rumah\s*sakit|beli\s*tiket)/i.test(lower) ||
      /(?:butuh\s*bantuan\s*uang|terlilit\s*hutang|tolong\s*transfer).*(?:sayang|nanti\s*aku\s*ganti\s*dobel)/i.test(lower)
    ) {
      flags.push('ROMANCE_FINANCIAL_SCAM');
      return {
        detected: true,
        category: 'ROMANCE_SCAM',
        severity: 'HIGH',
        riskScore: 80,
        flags,
      };
    }

    return {
      detected: false,
      category: 'OTHER',
      severity: 'LOW',
      riskScore: 0,
      flags: [],
    };
  }

  /**
   * Dangerous Content Detection (Critical Safety).
   * Immediate intervention policy for sexual exploitation, blackmail/sextortion, violent threats, CSAM.
   */
  public static detectDangerousContent(
    text: string,
    leetText: string
  ): { detected: boolean; isImmediateCritical: boolean; severity: ModerationSeverity; riskScore: number; flags: string[] } {
    const flags: string[] = [];
    const lower = text.toLowerCase();

    // 1. Blackmail & Sextortion (Critical)
    const sextortionPattern = /(?:sebar|viral(?:kan)?|bocorkan?).*?(?:foto|video|rekaman)?.*?(?:syur|bugil|telanjang|tanpa\s*busana|pribadi)/i;
    const reverseSextortionPattern = /(?:foto|video|rekaman)?.*?(?:syur|bugil|telanjang|tanpa\s*busana|pribadi).*?(?:sebar|viral(?:kan)?|bocorkan?)/i;
    const extortionMoneyPattern = /(?:transfer|bayar).*?(?:atau|kalo|kalau).*?(?:sebar|viral|bocor)/i;
    if (sextortionPattern.test(lower) || reverseSextortionPattern.test(lower) || extortionMoneyPattern.test(lower)) {
      flags.push('SEXTORTION_BLACKMAIL_THREAT');
      return {
        detected: true,
        isImmediateCritical: true,
        severity: 'CRITICAL',
        riskScore: 100,
        flags,
      };
    }

    // 2. Child Sexual Exploitation & Grooming (CSAM indicators)
    const csamIndicators = /(?:anak\s*sd|anak\s*smp|bocil|anak\s*kecil|dibawah\s*umur).*(?:bugil|telanjang|vcs|seks|buka\s*baju)/i;
    if (csamIndicators.test(lower)) {
      flags.push('CSAM_EXPLOITATION_INDICATOR');
      return {
        detected: true,
        isImmediateCritical: true,
        severity: 'CRITICAL',
        riskScore: 100,
        flags,
      };
    }

    // 3. Violent threats & physical harm
    const violentThreatPattern = /(?:saya|aku|gue)\s*(?:akan\s*)?(?:bunuh|habisi|tikam|bacok|mati\s*kamu)/i;
    if (violentThreatPattern.test(lower)) {
      flags.push('VIOLENT_PHYSICAL_THREAT');
      return {
        detected: true,
        isImmediateCritical: true,
        severity: 'CRITICAL',
        riskScore: 98,
        flags,
      };
    }

    // 4. Self-Harm Encouragement
    const selfHarmPattern = /(?:bunuh\s*diri\s*saja|mati\s*aja\s*lu|gantung\s*diri|sayat\s*tanganmu)/i;
    if (selfHarmPattern.test(lower)) {
      flags.push('SELF_HARM_ENCOURAGEMENT');
      return {
        detected: true,
        isImmediateCritical: true,
        severity: 'CRITICAL',
        riskScore: 95,
        flags,
      };
    }

    // 5. Doxxing (Leaking private identification / addresses maliciously)
    const doxxingPattern = /(?:nik\s*(?:kamu|anda)|nomor\s*kk|data\s*pribadimu\s*saya\s*bocorkan)/i;
    if (doxxingPattern.test(lower)) {
      flags.push('DOXXING_THREAT');
      return {
        detected: true,
        isImmediateCritical: false,
        severity: 'HIGH',
        riskScore: 85,
        flags,
      };
    }

    return {
      detected: false,
      isImmediateCritical: false,
      severity: 'LOW',
      riskScore: 0,
      flags: [],
    };
  }

  /**
   * Cross-Message Temporal Sequence Accumulation (Split-Message Evasion).
   * Catches:
   *  Pesan 1: "nomorku"
   *  Pesan 2: "08"
   *  Pesan 3: "231"
   *  Pesan 4: "2345678"
   */
  public static checkCrossMessageEvasion(
    sessionId: string,
    senderId: string,
    currentContent: string
  ): { detected: boolean; category: ModerationCategory; riskScore: number; flags: string[] } {
    const key = `${sessionId}:${senderId}`;
    const windowList = temporalMessageWindows.get(key) || [];
    const now = Date.now();

    // Keep messages from last 60 seconds (up to 5 previous messages)
    const recent = windowList.filter((m) => now - m.timestamp < 60000).slice(-5);
    if (recent.length === 0) {
      return { detected: false, category: 'OTHER', riskScore: 0, flags: [] };
    }

    // Combine recent messages with the current message
    const accumulatedText = recent.map((m) => m.content).join(' ') + ' ' + currentContent;
    const accumulatedCollapsed = this.createCollapsedShadow(accumulatedText);

    // Test accumulated text for Indonesian phone number
    const phoneCheck = this.detectIndonesianPhone(accumulatedText, accumulatedCollapsed);
    if (phoneCheck.detected) {
      return {
        detected: true,
        category: 'PHONE_NUMBER',
        riskScore: 80,
        flags: ['CROSS_MESSAGE_PHONE_SPLIT_EVASION', ...phoneCheck.flags],
      };
    }

    // Test accumulated text for external contact handle
    const leetShadow = this.createLeetShadow(accumulatedText);
    const contactCheck = this.detectExternalContact(accumulatedText, leetShadow);
    if (contactCheck.detected) {
      return {
        detected: true,
        category: 'EXTERNAL_CONTACT',
        riskScore: 75,
        flags: ['CROSS_MESSAGE_CONTACT_SPLIT_EVASION', ...contactCheck.flags],
      };
    }

    return { detected: false, category: 'OTHER', riskScore: 0, flags: [] };
  }

  /**
   * Record allowed or processed message in the temporal window
   */
  private static recordToTemporalWindow(sessionId: string, senderId: string, content: string): void {
    const key = `${sessionId}:${senderId}`;
    const windowList = temporalMessageWindows.get(key) || [];
    const now = Date.now();
    windowList.push({ content, timestamp: now });
    // Keep max 8 items and under 60 seconds
    const pruned = windowList.filter((m) => now - m.timestamp < 60000).slice(-8);
    temporalMessageWindows.set(key, pruned);
  }

  // ─── Shadow Creators ────────────────────────────────────────────────────────

  /**
   * Leetspeak shadow: translates numbers and symbols used as obfuscated letters
   */
  private static createLeetShadow(text: string): string {
    return text
      .replace(/0/g, 'o')
      .replace(/1/g, 'i')
      .replace(/3/g, 'e')
      .replace(/4/g, 'a')
      .replace(/5/g, 's')
      .replace(/7/g, 't')
      .replace(/8/g, 'b')
      .replace(/@/g, 'a')
      .replace(/\$/g, 's');
  }

  /**
   * Collapsed shadow: removes all spaces, dots, dashes, underscores, and asterisks
   */
  private static createCollapsedShadow(text: string): string {
    return text.replace(/[\s._\-*/\\]+/g, '');
  }
}
