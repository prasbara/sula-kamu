import { getDatabase } from '../../database/db';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp in seconds
}

export class ServerlessRateLimiter {
  private static memFallback = new Map<string, { count: number; resetAt: number }>();

  /**
   * Check and increment rate limit for a specific key.
   * Atomically persisted in SQLite serverless_rate_limits table.
   * 
   * @param key Unique identifier (e.g. `ip:127.0.0.1`, `tg:5764989848`, `auth:user_123`)
   * @param limit Maximum allowed requests within the time window
   * @param windowSeconds Time window in seconds (default: 60s)
   */
  public static checkLimit(key: string, limit: number, windowSeconds: number = 60): RateLimitResult {
    const now = Math.floor(Date.now() / 1000);

    try {
      const db = getDatabase();
      const row = db.prepare('SELECT count, reset_at FROM serverless_rate_limits WHERE key = ?').get(key) as
        | { count: number; reset_at: number }
        | undefined;

      if (!row || row.reset_at <= now) {
        const nextReset = now + windowSeconds;
        db.prepare(`
          INSERT INTO serverless_rate_limits (key, count, reset_at, created_at)
          VALUES (?, 1, ?, datetime('now'))
          ON CONFLICT(key) DO UPDATE SET count = 1, reset_at = excluded.reset_at
        `).run(key, nextReset);

        return {
          allowed: true,
          remaining: Math.max(0, limit - 1),
          resetAt: nextReset,
        };
      }

      if (row.count >= limit) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: row.reset_at,
        };
      }

      const newCount = row.count + 1;
      db.prepare('UPDATE serverless_rate_limits SET count = ? WHERE key = ?').run(newCount, key);

      return {
        allowed: true,
        remaining: Math.max(0, limit - newCount),
        resetAt: row.reset_at,
      };
    } catch (err) {
      console.warn(`[ServerlessRateLimiter] DB error for key ${key}, falling back to memory:`, err);
      return this.checkMemoryFallback(key, limit, windowSeconds, now);
    }
  }

  /**
   * Prune expired rate limit entries (callable by Vercel Cron Maintenance).
   */
  public static pruneExpired(): number {
    try {
      const db = getDatabase();
      const now = Math.floor(Date.now() / 1000);
      const res = db.prepare('DELETE FROM serverless_rate_limits WHERE reset_at < ?').run(now);
      return Number(res.changes || 0);
    } catch {
      return 0;
    }
  }

  private static checkMemoryFallback(key: string, limit: number, windowSeconds: number, now: number): RateLimitResult {
    const entry = this.memFallback.get(key);
    if (!entry || entry.resetAt <= now) {
      const nextReset = now + windowSeconds;
      this.memFallback.set(key, { count: 1, resetAt: nextReset });
      return { allowed: true, remaining: limit - 1, resetAt: nextReset };
    }

    if (entry.count >= limit) {
      return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count++;
    return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
  }
}
