import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/db';

export interface TelegramIdentitySnapshot {
  id: string;
  userId: string;
  telegramId: string;
  previousUsername: string | null;
  newUsername: string | null;
  previousDisplayName: string | null;
  newDisplayName: string | null;
  changeType: 'INITIAL_SNAPSHOT' | 'USERNAME_CHANGE' | 'DISPLAY_NAME_CHANGE' | 'BOTH_CHANGED';
  detectedAt: string;
}

export interface UserResolvedIdentity {
  userId: string; // internal_user_id (Primary)
  telegramId: string;
  currentUsername: string | null;
  currentDisplayName: string | null;
  accountStatus: string;
  verificationStatus: string;
  subscriptionStatus: string;
  history: TelegramIdentitySnapshot[];
  matchedVia: 'INTERNAL_USER_ID' | 'TELEGRAM_ID' | 'CURRENT_USERNAME' | 'HISTORICAL_USERNAME' | 'NONE';
  matchedQuery?: string;
}

export class IdentityService {
  /**
   * Record or update identity snapshot.
   * Compares with current record in database; if username or display name changed,
   * creates an immutable audit snapshot in telegram_identity_history.
   */
  public static recordIdentitySnapshot(params: {
    userId: string;
    telegramId: string;
    username?: string | null;
    displayName?: string | null;
  }): { changed: boolean; historyId?: string } {
    const db = getDatabase();
    const cleanUsername = params.username ? params.username.replace(/^@/, '').trim() : null;
    const cleanDisplayName = params.displayName ? params.displayName.trim() : null;

    const user = db.prepare(`
      SELECT id, telegram_id, telegram_username, telegram_display_name
      FROM users
      WHERE id = ?
    `).get(params.userId) as {
      id: string;
      telegram_id: string;
      telegram_username: string | null;
      telegram_display_name: string | null;
    } | undefined;

    if (!user) {
      return { changed: false };
    }

    const prevUsername = user.telegram_username;
    const prevDisplayName = user.telegram_display_name;

    const usernameChanged = cleanUsername !== null && cleanUsername !== prevUsername;
    const displayNameChanged = cleanDisplayName !== null && cleanDisplayName !== prevDisplayName;

    if (!usernameChanged && !displayNameChanged && prevUsername !== null) {
      return { changed: false };
    }

    let changeType: 'INITIAL_SNAPSHOT' | 'USERNAME_CHANGE' | 'DISPLAY_NAME_CHANGE' | 'BOTH_CHANGED' = 'INITIAL_SNAPSHOT';
    if (prevUsername !== null || prevDisplayName !== null) {
      if (usernameChanged && displayNameChanged) {
        changeType = 'BOTH_CHANGED';
      } else if (usernameChanged) {
        changeType = 'USERNAME_CHANGE';
      } else {
        changeType = 'DISPLAY_NAME_CHANGE';
      }
    }

    const historyId = uuidv4();
    db.prepare(`
      INSERT INTO telegram_identity_history (
        id, user_id, telegram_id, previous_username, new_username,
        previous_display_name, new_display_name, change_type, detected_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      historyId,
      params.userId,
      params.telegramId,
      prevUsername,
      cleanUsername,
      prevDisplayName,
      cleanDisplayName,
      changeType
    );

    // Update active record in users
    db.prepare(`
      UPDATE users
      SET telegram_username = coalesce(?, telegram_username),
          telegram_display_name = coalesce(?, telegram_display_name),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(cleanUsername, cleanDisplayName, params.userId);

    return { changed: true, historyId };
  }

  /**
   * Get all historical snapshots for an internal user ID
   */
  public static getIdentityHistory(userId: string): TelegramIdentitySnapshot[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT 
        id,
        user_id as userId,
        telegram_id as telegramId,
        previous_username as previousUsername,
        new_username as newUsername,
        previous_display_name as previousDisplayName,
        new_display_name as newDisplayName,
        change_type as changeType,
        detected_at as detectedAt
      FROM telegram_identity_history
      WHERE user_id = ?
      ORDER BY detected_at DESC
    `).all(userId) as unknown as TelegramIdentitySnapshot[];

    return rows;
  }

  /**
   * Resolve user identity from any identifier:
   * 1. Internal User ID (exact)
   * 2. Telegram ID (numeric string)
   * 3. Current Telegram username (with or without @)
   * 4. Historical Telegram username (matching past records in telegram_identity_history)
   */
  public static resolveUserByAnyIdentifier(query: string): UserResolvedIdentity | null {
    if (!query || !query.trim()) return null;
    const db = getDatabase();
    const cleanQuery = query.trim().replace(/^@/, '');

    // 1. Direct match on internal user_id
    let userRow = db.prepare(`
      SELECT id, telegram_id, telegram_username, telegram_display_name, status, verification_status, subscription_status
      FROM users
      WHERE id = ?
    `).get(query.trim()) as any;

    let matchedVia: UserResolvedIdentity['matchedVia'] = 'INTERNAL_USER_ID';

    // 2. Direct match on telegram_id
    if (!userRow) {
      userRow = db.prepare(`
        SELECT id, telegram_id, telegram_username, telegram_display_name, status, verification_status, subscription_status
        FROM users
        WHERE telegram_id = ?
      `).get(cleanQuery) as any;
      if (userRow) matchedVia = 'TELEGRAM_ID';
    }

    // 3. Match on current telegram_username
    if (!userRow) {
      userRow = db.prepare(`
        SELECT id, telegram_id, telegram_username, telegram_display_name, status, verification_status, subscription_status
        FROM users
        WHERE lower(telegram_username) = lower(?)
      `).get(cleanQuery) as any;
      if (userRow) matchedVia = 'CURRENT_USERNAME';
    }

    // 4. Match on historical telegram_username
    if (!userRow) {
      const historyRow = db.prepare(`
        SELECT user_id
        FROM telegram_identity_history
        WHERE lower(previous_username) = lower(?) OR lower(new_username) = lower(?)
        ORDER BY detected_at DESC
        LIMIT 1
      `).get(cleanQuery, cleanQuery) as { user_id: string } | undefined;

      if (historyRow) {
        userRow = db.prepare(`
          SELECT id, telegram_id, telegram_username, telegram_display_name, status, verification_status, subscription_status
          FROM users
          WHERE id = ?
        `).get(historyRow.user_id) as any;
        if (userRow) matchedVia = 'HISTORICAL_USERNAME';
      }
    }

    if (!userRow) return null;

    const history = this.getIdentityHistory(userRow.id);

    return {
      userId: userRow.id,
      telegramId: userRow.telegram_id,
      currentUsername: userRow.telegram_username,
      currentDisplayName: userRow.telegram_display_name,
      accountStatus: userRow.status,
      verificationStatus: userRow.verification_status,
      subscriptionStatus: userRow.subscription_status,
      history,
      matchedVia,
      matchedQuery: query,
    };
  }
}
