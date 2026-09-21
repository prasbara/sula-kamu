-- SULA Platform Database Schema
-- Strict privacy by default, separated tables, opaque internal UUIDs.

PRAGMA foreign_keys = ON;

-- 1. Supported Institutions Registry (Semarang Region - Exactly 33 fixed institutions)
CREATE TABLE IF NOT EXISTS institutions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('UNIVERSITY', 'POLYTECHNIC', 'HEALTH_ACADEMY')),
    campus_cluster TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. System Emergency Settings & Product Configurations
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_by TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 3. Public Aggregated Statistics (Immutable/Cumulative metric)
CREATE TABLE IF NOT EXISTS public_statistics (
    id TEXT PRIMARY KEY,
    students_joined_total INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 4. Users Table (Core Identity, Account Status, Verification, Subscription)
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    telegram_id TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK(status IN ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED')),
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK(verification_status IN ('UNVERIFIED', 'PHOTO_PENDING', 'PHOTO_VERIFIED', 'KTM_PENDING', 'KTM_VERIFIED', 'VERIFICATION_REJECTED', 'VERIFICATION_REVIEW')),
    subscription_status TEXT NOT NULL DEFAULT 'FREE' CHECK(subscription_status IN ('FREE', 'PREMIUM_PENDING', 'PREMIUM_ACTIVE', 'PREMIUM_EXPIRED', 'PREMIUM_REVOKED')),
    is_18_plus INTEGER NOT NULL DEFAULT 0,
    birth_date TEXT,
    risk_score INTEGER NOT NULL DEFAULT 0,
    onboarding_completed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 5. Student Profiles (Discoverable attributes - Minimal data)
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
    coarse_area TEXT, -- Coarse neighborhood
    photo_file_id TEXT, -- Sanitized internal file storage ID
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(institution_id) REFERENCES institutions(id)
);

-- 6. Student Verifications (Primary Identity Verification - KTM)
CREATE TABLE IF NOT EXISTS student_verifications (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    institution_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'VERIFIED', 'REJECTED', 'NEEDS_REVIEW', 'SUSPENDED')),
    card_hash TEXT NOT NULL, -- SHA-256 / Perceptual hash
    ocr_extracted_text TEXT,
    ocr_confidence REAL DEFAULT 0.0,
    review_notes TEXT,
    reviewer_id TEXT,
    verified_at TEXT,
    expires_at TEXT, -- Document retention expiry
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(institution_id) REFERENCES institutions(id)
);

-- 7. Real Photo Verifications (Level 1: Photo-Verified without KTM)
CREATE TABLE IF NOT EXISTS photo_verifications (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL,
    photo_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PHOTO_PENDING' CHECK(status IN ('PHOTO_PENDING', 'PHOTO_VERIFIED', 'REJECTED')),
    review_notes TEXT,
    reviewer_id TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 8. Verification Attempts (Anti-Abuse / Rate Limiting / Card Farming Prevention)
CREATE TABLE IF NOT EXISTS verification_attempts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    card_hash TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('SUCCESS', 'FAILED_DUPLICATE', 'FAILED_OCR', 'NEEDS_REVIEW', 'RATE_LIMITED')),
    failure_reason TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 9. Daily Like Usage (Server-side atomic tracking)
CREATE TABLE IF NOT EXISTS daily_like_usage (
    user_id TEXT NOT NULL,
    usage_date TEXT NOT NULL, -- YYYY-MM-DD
    like_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY(user_id, usage_date),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 10. Discovery Interactions: Likes & Passes
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

-- 11. Mutual Matches
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

-- 12. In-Bot Relayed Messages
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

-- 13. User Blocks
CREATE TABLE IF NOT EXISTS blocks (
    id TEXT PRIMARY KEY,
    blocker_id TEXT NOT NULL,
    blocked_id TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(blocker_id, blocked_id),
    FOREIGN KEY(blocker_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(blocked_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 14. Reports & Case Management
CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    report_code TEXT UNIQUE NOT NULL,
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

-- 15. Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price INTEGER NOT NULL,
    duration_days INTEGER NOT NULL DEFAULT 30,
    badge_label TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 16. Payment Requests (Initiated through Website)
CREATE TABLE IF NOT EXISTS payment_requests (
    id TEXT PRIMARY KEY, -- e.g. PAY-NIVA-000124
    user_id TEXT NOT NULL,
    plan_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'QRIS',
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PROOF_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED')),
    proof_image_path TEXT,
    proof_submitted_at TEXT,
    reviewed_by TEXT,
    reviewed_at TEXT,
    review_notes TEXT,
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(plan_id) REFERENCES subscription_plans(id)
);

-- 17. Active Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    payment_id TEXT UNIQUE,
    plan_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'EXPIRED', 'REVOKED')),
    starts_at TEXT NOT NULL DEFAULT (datetime('now')),
    ends_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 18. Support Tickets & Chat Queue (FIFO support queue)
CREATE TABLE IF NOT EXISTS support_tickets (
    id TEXT PRIMARY KEY, -- e.g. NIVA-PREM-001248
    user_id TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'PREMIUM' CHECK(type IN ('PREMIUM', 'GENERAL', 'VERIFICATION', 'ACCOUNT')),
    subject TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN', 'WAITING', 'IN_PROGRESS', 'WAITING_FOR_USER', 'RESOLVED', 'CLOSED')),
    priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK(priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
    assigned_admin_id TEXT,
    internal_notes TEXT,
    closed_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 19. Support Messages (Two-way chat between User and Admin)
CREATE TABLE IF NOT EXISTS support_messages (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL,
    sender_type TEXT NOT NULL CHECK(sender_type IN ('USER', 'ADMIN', 'SYSTEM')),
    sender_id TEXT NOT NULL,
    sender_name TEXT NOT NULL,
    body TEXT NOT NULL,
    is_internal INTEGER NOT NULL DEFAULT 0, -- 1 for internal admin-only notes
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
);

-- 20. Single-Use Cryptographic Bridge Tokens (Telegram to Website Auth)
CREATE TABLE IF NOT EXISTS bridge_tokens (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    purpose TEXT NOT NULL DEFAULT 'PREMIUM_SUPPORT',
    target_ticket_id TEXT,
    expires_at TEXT NOT NULL,
    used_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 21. Admin & Staff Roles (RBAC with MFA / TOTP)
CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('SUPER_ADMIN', 'PAYMENT_ADMIN', 'VERIFICATION_ADMIN', 'MODERATOR', 'SUPPORT_ADMIN', 'AUDITOR')),
    totp_secret TEXT,
    totp_enabled INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 22. Server-Side Admin Sessions
CREATE TABLE IF NOT EXISTS admin_sessions (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    token_hash TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    last_active_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL,
    is_revoked INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
);

-- 23. Brute-Force Protection & Rate Limiting
CREATE TABLE IF NOT EXISTS login_attempts (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    is_successful INTEGER NOT NULL,
    attempted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 24. Audit Logs (Immutable append-only privileged trail)
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

-- 21. Security Events
CREATE TABLE IF NOT EXISTS security_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK(severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    details TEXT,
    user_id TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 25. Real User Review System (Section 20 - 33)
CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    recommend INTEGER NOT NULL DEFAULT 1,
    improvement_category TEXT CHECK(improvement_category IN ('MATCHING', 'DISCOVERY', 'VERIFICATION', 'TELEGRAM', 'WEBSITE', 'PREMIUM', 'SAFETY', 'PERFORMANCE', 'OTHER')),
    status TEXT NOT NULL DEFAULT 'PENDING_REVIEW' CHECK(status IN ('PENDING_REVIEW', 'APPROVED', 'REJECTED')),
    rejection_reason TEXT,
    admin_response TEXT,
    admin_response_at TEXT,
    environment TEXT NOT NULL DEFAULT 'PRODUCTION' CHECK(environment IN ('PRODUCTION', 'TEST', 'STAGING')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Performance & Integrity Indexes
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users(verification_status);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_profiles_institution ON profiles(institution_id);
CREATE INDEX IF NOT EXISTS idx_student_verifications_status ON student_verifications(status);
CREATE INDEX IF NOT EXISTS idx_photo_verifications_status ON photo_verifications(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_requests_fifo ON payment_requests(created_at ASC);
CREATE INDEX IF NOT EXISTS idx_daily_like_usage ON daily_like_usage(user_id, usage_date);
CREATE INDEX IF NOT EXISTS idx_likes_from_to ON likes(from_user_id, to_user_id);
CREATE INDEX IF NOT EXISTS idx_matches_users ON matches(user_a_id, user_b_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
