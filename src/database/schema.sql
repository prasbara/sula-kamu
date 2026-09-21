-- SULA Platform Database Schema
-- Strict privacy by default, separated tables, opaque internal UUIDs.

PRAGMA foreign_keys = ON;

-- 1. Supported Institutions Registry (Semarang Region)
CREATE TABLE IF NOT EXISTS institutions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('UNIVERSITY', 'POLYTECHNIC', 'HEALTH_ACADEMY')),
    campus_cluster TEXT NOT NULL, -- e.g. Tembalang, Sekaran, Pleburan, Sampangan, Pedurungan, etc.
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. System Emergency Settings (Kill Switches)
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_by TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Users Table (Core Identity & Account Status)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    telegram_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK(status IN ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED')),
    is_18_plus INTEGER NOT NULL DEFAULT 0,
    birth_date TEXT,
    risk_score INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. Student Profiles (Discoverable attributes - Minimal data)
CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    age INTEGER NOT NULL,
    institution_id TEXT NOT NULL,
    study_field TEXT NOT NULL,
    bio TEXT,
    interests TEXT NOT NULL DEFAULT '[]', -- JSON string array
    relationship_intent TEXT NOT NULL DEFAULT 'DATING' CHECK(relationship_intent IN ('DATING', 'NEW_FRIENDS', 'STUDY_BUDDY', 'SERIOUS_RELATIONSHIP')),
    coarse_area TEXT, -- Coarse neighborhood: Tembalang, Banyumanik, Gunungpati, Semarang Tengah, etc.
    photo_file_id TEXT, -- Sanitized internal file storage ID
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(institution_id) REFERENCES institutions(id)
);

-- 5. Student Verifications (Primary Identity Verification - KTM)
CREATE TABLE IF NOT EXISTS student_verifications (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    institution_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'VERIFIED', 'REJECTED', 'NEEDS_REVIEW', 'SUSPENDED')),
    card_hash TEXT NOT NULL, -- SHA-256 / Perceptual hash for duplicate card detection
    ocr_extracted_text TEXT,
    ocr_confidence REAL DEFAULT 0.0,
    review_notes TEXT,
    reviewer_id TEXT,
    verified_at TEXT,
    expires_at TEXT, -- Document retention expiry date (auto-purge raw buffer)
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(institution_id) REFERENCES institutions(id)
);

-- 6. Verification Attempts (Anti-Abuse / Rate Limiting / Card Farming Prevention)
CREATE TABLE IF NOT EXISTS verification_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    card_hash TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('SUCCESS', 'FAILED_DUPLICATE', 'FAILED_OCR', 'NEEDS_REVIEW', 'RATE_LIMITED')),
    failure_reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Discovery Interactions: Likes & Passes
CREATE TABLE IF NOT EXISTS likes (
    id TEXT PRIMARY KEY,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(from_user_id, to_user_id),
    FOREIGN KEY(from_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(to_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS passes (
    id TEXT PRIMARY KEY,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(from_user_id, to_user_id),
    FOREIGN KEY(from_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(to_user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Mutual Matches
CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    user_a_id TEXT NOT NULL,
    user_b_id TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    unmatched_by TEXT,
    unmatched_reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_a_id, user_b_id),
    FOREIGN KEY(user_a_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(user_b_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. In-Bot Relayed Messages (Protected between mutual matches only)
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    content TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(recipient_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. User Blocks
CREATE TABLE IF NOT EXISTS blocks (
    id TEXT PRIMARY KEY,
    blocker_id TEXT NOT NULL,
    blocked_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(blocker_id, blocked_id),
    FOREIGN KEY(blocker_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(blocked_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 11. Reports & Case Management
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    report_code TEXT UNIQUE NOT NULL, -- e.g. REP-000101
    reporter_id TEXT NOT NULL,
    reported_id TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN (
        'HARASSMENT', 'SCAM', 'FAKE_IDENTITY', 'SEXUAL_HARASSMENT',
        'THREAT', 'SPAM', 'IMPERSONATION', 'INAPPROPRIATE_CONTENT', 'OTHER'
    )),
    evidence_text TEXT,
    evidence_media_id TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'UNDER_INVESTIGATION', 'RESOLVED', 'DISMISSED')),
    assigned_moderator_id TEXT,
    moderator_notes TEXT,
    resolution_action TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(reported_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 12. Subscriptions & Premium Readiness
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    tier TEXT NOT NULL DEFAULT 'FREE' CHECK(tier IN ('FREE', 'STUDENT_PREMIUM', 'BOOST')),
    starts_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 13. Admin & Staff Roles
CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN', 'VERIFICATION_REVIEWER', 'MODERATOR', 'SUPPORT', 'AUDITOR')),
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 14. Audit Logs (Immutable audit trail for all privileged actions)
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_id TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action TEXT NOT NULL,
    target_resource TEXT NOT NULL,
    target_id TEXT,
    details TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 15. Security Events (Rate limiting, suspicious patterns, fraud attempts)
CREATE TABLE IF NOT EXISTS security_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    details TEXT,
    user_id TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Performance & Integrity Indexes
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_profiles_institution ON profiles(institution_id);
CREATE INDEX IF NOT EXISTS idx_student_verifications_status ON student_verifications(status);
CREATE INDEX IF NOT EXISTS idx_student_verifications_card_hash ON student_verifications(card_hash);
CREATE INDEX IF NOT EXISTS idx_likes_from_to ON likes(from_user_id, to_user_id);
CREATE INDEX IF NOT EXISTS idx_matches_users ON matches(user_a_id, user_b_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
