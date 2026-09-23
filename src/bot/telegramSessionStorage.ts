import { StorageAdapter } from 'grammy';
import { getDatabase } from '../database/db';

/**
 * SQLite-backed persistent session storage adapter for Grammy Bot.
 * Eliminates serverless in-memory state loss across Vercel Lambda invocations.
 */
export function createSqliteSessionStorage<T>(): StorageAdapter<T> {
  return {
    read(key: string): T | undefined {
      try {
        const db = getDatabase();
        const row = db.prepare('SELECT value FROM telegram_sessions WHERE key = ?').get(key) as { value: string } | undefined;
        if (!row || !row.value) return undefined;
        return JSON.parse(row.value) as T;
      } catch (err) {
        console.warn(`[SqliteSessionStorage] Failed to read session for key ${key}:`, err);
        return undefined;
      }
    },

    write(key: string, value: T): void {
      try {
        const db = getDatabase();
        const serialized = JSON.stringify(value);
        db.prepare(`
          INSERT INTO telegram_sessions (key, value, updated_at)
          VALUES (?, ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')
        `).run(key, serialized);
      } catch (err) {
        console.warn(`[SqliteSessionStorage] Failed to write session for key ${key}:`, err);
      }
    },

    delete(key: string): void {
      try {
        const db = getDatabase();
        db.prepare('DELETE FROM telegram_sessions WHERE key = ?').run(key);
      } catch (err) {
        console.warn(`[SqliteSessionStorage] Failed to delete session for key ${key}:`, err);
      }
    },
  };
}
