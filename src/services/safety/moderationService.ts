import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../../database/db.js';
import { AuditLog, Report, ReportCategory, ReportStatus, SecurityEvent } from '../../types/index.js';

export interface CreateReportInput {
  reporterUserId: string;
  reportedUserId: string;
  category: ReportCategory;
  evidenceText?: string;
  evidenceMediaId?: string;
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
        evidence_text, evidence_media_id, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN')
    `).run(
      reportId,
      reportCode,
      input.reporterUserId,
      input.reportedUserId,
      input.category,
      input.evidenceText || null,
      input.evidenceMediaId || null
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
      details: `Report ${report.report_code} resolved with ${action}. Notes: ${notes}`,
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
