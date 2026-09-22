import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/db';
import { AuditLog, Report, ReportCategory, ReportStatus, SecurityEvent } from '../../types/index';

export interface CreateReportInput {
  reporterUserId: string;
  reportedUserId: string;
  category: ReportCategory;
  evidenceText?: string;
  evidenceMediaId?: string;
  reportedUsernameAtTime?: string;
}

export class ModerationService {
  /**
   * Submit an incident report and generate case number (Section 19)
   */
  public static createReport(input: CreateReportInput): Report {
    const db = getDatabase();

    // Generate consecutive-like opaque code e.g. REP-10293
    const countRow = db.prepare('SELECT COUNT(*) as count FROM reports').get() as { count: number };
    const codeNumber = (countRow.count + 1).toString().padStart(6, '0');
    const reportCode = `REP-${codeNumber}`;

    const reportId = uuidv4();
    db.prepare(`
      INSERT INTO reports (
        id, report_code, reporter_id, reported_id, category,
        evidence_text, evidence_media_id, status, reported_username_at_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)
    `).run(
      reportId,
      reportCode,
      input.reporterUserId,
      input.reportedUserId,
      input.category,
      input.evidenceText || null,
      input.evidenceMediaId || null,
      input.reportedUsernameAtTime || null
    );

    // Auto-block the reported user for immediate safety
    this.blockUser(input.reporterUserId, input.reportedUserId, `Auto-blocked upon reporting ${reportCode}`);

    // Log security event
    this.logSecurityEvent('USER_REPORTED', 'MEDIUM', `Report ${reportCode} submitted under ${input.category}`, input.reportedUserId);

    return db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId) as unknown as Report;
  }

  /**
   * Block a user
   */
  public static blockUser(blockerId: string, blockedId: string, reason?: string): void {
    const db = getDatabase();
    db.prepare(`
      INSERT OR IGNORE INTO blocks (id, blocker_id, blocked_id)
      VALUES (?, ?, ?)
    `).run(uuidv4(), blockerId, blockedId);

    // Deactivate any active match between them
    db.prepare(`
      UPDATE matches 
      SET is_active = 0, unmatched_by = ?, unmatched_reason = 'BLOCKED', updated_at = datetime('now')
      WHERE (user_a_id = ? AND user_b_id = ?) OR (user_a_id = ? AND user_b_id = ?)
    `).run(blockerId, blockerId, blockedId, blockedId, blockerId);
  }

  /**
   * List reports for moderator queue
   */
  public static getReports(status?: ReportStatus): Report[] {
    const db = getDatabase();
    if (status) {
      return db.prepare('SELECT * FROM reports WHERE status = ? ORDER BY created_at DESC').all(status) as unknown as Report[];
    }
    return db.prepare('SELECT * FROM reports ORDER BY created_at DESC').all() as unknown as Report[];
  }

  /**
   * Get reports with rich identity resolution (Historical username vs Current username)
   */
  public static getReportsWithDetails(status?: string, category?: string, search?: string): any[] {
    const db = getDatabase();
    let sql = `
      SELECT 
        r.id,
        r.report_code,
        r.category,
        r.evidence_text,
        r.evidence_media_id,
        r.status,
        r.assigned_moderator_id,
        r.moderator_notes,
        r.resolution_action,
        r.created_at,
        r.updated_at,
        r.reported_username_at_time,
        -- Reporter details
        r.reporter_id,
        rp.display_name as reporter_display_name,
        ru.telegram_id as reporter_telegram_id,
        -- Reported user details
        r.reported_id as reported_user_id,
        u.telegram_id as reported_telegram_id,
        u.telegram_username as reported_current_username,
        u.telegram_display_name as reported_current_display_name,
        u.status as reported_account_status,
        u.verification_status as reported_verification_status,
        u.subscription_status as reported_subscription_status,
        p.display_name as reported_profile_name,
        (SELECT COUNT(*) FROM reports WHERE reported_id = r.reported_id) as reported_total_reports_count
      FROM reports r
      LEFT JOIN users ru ON ru.id = r.reporter_id
      LEFT JOIN profiles rp ON rp.user_id = r.reporter_id
      LEFT JOIN users u ON u.id = r.reported_id
      LEFT JOIN profiles p ON p.user_id = r.reported_id
      WHERE 1=1
    `;

    const params: any[] = [];

    if (status && status !== 'ALL') {
      sql += ' AND r.status = ? ';
      params.push(status);
    }

    if (category && category !== 'ALL') {
      sql += ' AND r.category = ? ';
      params.push(category);
    }

    if (search && search.trim()) {
      const q = `%${search.trim().replace(/^@/, '')}%`;
      sql += ` AND (
        r.report_code LIKE ? OR 
        r.reported_id LIKE ? OR 
        u.telegram_id LIKE ? OR 
        u.telegram_username LIKE ? OR 
        r.reported_username_at_time LIKE ? OR 
        p.display_name LIKE ?
      )`;
      params.push(q, q, q, q, q, q);
    }

    sql += ' ORDER BY r.created_at DESC ';

    const rows = db.prepare(sql).all(...params) as any[];

    // Enrich with historical usernames from telegram_identity_history
    return rows.map((row) => {
      const historyRows = db.prepare(`
        SELECT previous_username, new_username, detected_at
        FROM telegram_identity_history
        WHERE user_id = ?
        ORDER BY detected_at DESC
      `).all(row.reported_user_id) as any[];

      const historicalUsernames = Array.from(new Set(
        historyRows
          .flatMap((h) => [h.previous_username, h.new_username])
          .filter((un) => un && un !== row.reported_current_username)
      ));

      return {
        ...row,
        historical_usernames: historicalUsernames,
      };
    });
  }

  /**
   * Moderator action on a report: WARN, SUSPEND, BAN, DISMISS
   */
  public static resolveReport(
    reportId: string,
    moderatorId: string,
    action: 'WARN' | 'SUSPEND' | 'BAN' | 'DISMISS',
    notes: string
  ): void {
    const db = getDatabase();
    const report = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId) as Report | undefined;
    if (!report) throw new Error('Report not found');

    const previousStatus = report.status;
    let newStatus: ReportStatus = action === 'DISMISS' ? 'DISMISSED' : 'RESOLVED';

    db.prepare(`
      UPDATE reports
      SET status = ?, assigned_moderator_id = ?, moderator_notes = ?, resolution_action = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newStatus, moderatorId, notes, action, reportId);

    // Apply sanctions if action is SUSPEND or BAN
    if (action === 'BAN') {
      db.prepare("UPDATE users SET status = 'BANNED', updated_at = datetime('now') WHERE id = ?").run(report.reported_id);
      db.prepare("UPDATE profiles SET is_active = 0, updated_at = datetime('now') WHERE user_id = ?").run(report.reported_id);
    } else if (action === 'SUSPEND') {
      db.prepare("UPDATE users SET status = 'SUSPENDED', updated_at = datetime('now') WHERE id = ?").run(report.reported_id);
      db.prepare("UPDATE profiles SET is_active = 0, updated_at = datetime('now') WHERE user_id = ?").run(report.reported_id);
    }

    // Write to immutable audit log (Section 18 & 27)
    this.logAudit({
      actorId: moderatorId,
      actorRole: 'MODERATOR',
      action: `RESOLVE_REPORT_${action}`,
      targetResource: 'reports',
      targetId: reportId,
      details: `Report ${report.report_code} on user ${report.reported_id} transitioned from ${previousStatus} to ${newStatus} via ${action}. Notes: ${notes}`,
    });
  }

  /**
   * Log an immutable privileged audit event
   */
  public static logAudit(entry: {
    actorId: string;
    actorRole: string;
    action: string;
    targetResource: string;
    targetId?: string;
    details?: string;
    ipAddress?: string;
  }): void {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO audit_logs (id, actor_id, actor_role, action, target_resource, target_id, details, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      entry.actorId,
      entry.actorRole,
      entry.action,
      entry.targetResource,
      entry.targetId || null,
      entry.details || null,
      entry.ipAddress || null
    );
  }

  /**
   * Log a security event
   */
  public static logSecurityEvent(
    eventType: string,
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
    details: string,
    userId?: string,
    ipAddress?: string
  ): void {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO security_events (id, event_type, severity, details, user_id, ip_address)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), eventType, severity, details, userId || null, ipAddress || null);
  }

  /**
   * Emergency Killswitch toggle
   */
  public static toggleSystemSetting(key: string, enabled: boolean, actorId: string): void {
    const db = getDatabase();
    db.prepare(`
      INSERT INTO system_settings (key, value, updated_by, updated_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_by = excluded.updated_by, updated_at = datetime('now')
    `).run(key, enabled ? 'true' : 'false', actorId);

    this.logAudit({
      actorId,
      actorRole: 'SUPER_ADMIN',
      action: `EMERGENCY_SWITCH_${key.toUpperCase()}`,
      targetResource: 'system_settings',
      details: `Set ${key} to ${enabled}`,
    });
  }
}
