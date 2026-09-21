const Database = require('better-sqlite3');
const db = new Database('data/sula.db');

db.exec(`
CREATE TABLE IF NOT EXISTS safe_chat_sessions (
    id TEXT PRIMARY KEY,
    match_id TEXT UNIQUE NOT NULL,
    started_at TEXT NOT NULL DEFAULT (datetime('now')),
    sandbox_ends_at TEXT NOT NULL,
    phase TEXT NOT NULL DEFAULT 'SANDBOX',
    message_count INTEGER NOT NULL DEFAULT 0,
    flagged_message_count INTEGER NOT NULL DEFAULT 0,
    last_moderation_action TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS private_contact_consents (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL,
    requester_id TEXT NOT NULL,
    responder_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    requested_at TEXT NOT NULL DEFAULT (datetime('now')),
    responded_at TEXT,
    expires_at TEXT NOT NULL,
    UNIQUE(match_id, requester_id)
);

CREATE TABLE IF NOT EXISTS moderated_messages (
    id TEXT PRIMARY KEY,
    match_id TEXT NOT NULL,
    message_id TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    content_snapshot TEXT NOT NULL,
    flags TEXT NOT NULL DEFAULT '[]',
    action_taken TEXT NOT NULL DEFAULT 'ALLOWED',
    moderation_score REAL NOT NULL DEFAULT 0.0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_safe_chat_match ON safe_chat_sessions(match_id);
CREATE INDEX IF NOT EXISTS idx_safe_chat_phase ON safe_chat_sessions(phase);
CREATE INDEX IF NOT EXISTS idx_private_consents_match ON private_contact_consents(match_id);
CREATE INDEX IF NOT EXISTS idx_moderated_messages_match ON moderated_messages(match_id);
CREATE INDEX IF NOT EXISTS idx_moderated_messages_sender ON moderated_messages(sender_id);
`);

console.log('Migration complete.');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('Tables:', tables.map(t => t.name).join(', '));
db.close();
