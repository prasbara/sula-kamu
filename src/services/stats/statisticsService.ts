import { getDatabase } from '../../database/db';

export interface PublicStats {
  studentsJoined: number;
  institutions: number;
}

export class StatisticsService {
  /**
   * Fetch public aggregate statistics sourced from database
   */
  public static getPublicStats(): PublicStats {
    const db = getDatabase();

    // Ensure singleton exists
    let row = db.prepare('SELECT students_joined_total FROM public_statistics WHERE id = ?').get('singleton') as
      | { students_joined_total: number }
      | undefined;

    if (!row) {
      // Calculate from existing active users
      const countRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'ACTIVE'").get() as {
        count: number;
      };
      const initialTotal = Math.max(1, countRow.count);

      db.prepare(`
        INSERT INTO public_statistics (id, students_joined_total, updated_at)
        VALUES ('singleton', ?, datetime('now'))
      `).run(initialTotal);

      row = { students_joined_total: initialTotal };
    }

    return {
      studentsJoined: row.students_joined_total,
      institutions: 33, // Fixed 33 institutions per Section 1
    };
  }

  /**
   * Increment cumulative joined-user counter when onboarding milestone is completed
   */
  public static recordOnboardingCompletion(userId: string): number {
    const db = getDatabase();

    const user = db.prepare('SELECT onboarding_completed_at, status FROM users WHERE id = ?').get(userId) as
      | { onboarding_completed_at: string | null; status: string }
      | undefined;

    if (!user) return this.getPublicStats().studentsJoined;

    if (!user.onboarding_completed_at) {
      db.prepare(`
        UPDATE users 
        SET onboarding_completed_at = datetime('now'),
            status = CASE WHEN status = 'PENDING_VERIFICATION' THEN 'ACTIVE' ELSE status END,
            updated_at = datetime('now')
        WHERE id = ?
      `).run(userId);

      // Atomically increment cumulative count
      db.prepare(`
        INSERT INTO public_statistics (id, students_joined_total, updated_at)
        VALUES ('singleton', 1, datetime('now'))
        ON CONFLICT(id) DO UPDATE SET 
          students_joined_total = students_joined_total + 1,
          updated_at = datetime('now')
      `).run();
    }

    return this.getPublicStats().studentsJoined;
  }
}
