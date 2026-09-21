import { getDatabase } from '../../database/db';
import { NotifyService } from '../notification/notifyService';

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
      // Calculate from existing active chatbot users (strictly excluding anonymous stranger cam users)
      const countRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'ACTIVE' AND telegram_id NOT LIKE 'stranger_%'").get() as {
        count: number;
      };
      const initialTotal = countRow.count;

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

      // Trigger NotifyNIVABot notification asynchronously with safe failure isolation
      try {
        const profile = db.prepare(`
          SELECT p.display_name, i.name as institution_name, u.verification_status 
          FROM users u
          LEFT JOIN profiles p ON p.user_id = u.id
          LEFT JOIN institutions i ON i.id = p.institution_id
          WHERE u.id = ?
        `).get(userId) as { display_name?: string; institution_name?: string; verification_status?: string } | undefined;

        const newTotal = this.getPublicStats().studentsJoined;
        NotifyService.notifyNewUser({
          userId,
          name: profile?.display_name || 'New Student',
          institutionName: profile?.institution_name || 'Semarang Campus',
          verificationLevel: profile?.verification_status === 'KTM_VERIFIED' ? 'Student Verified (KTM)' : 'Photo Verified',
          totalStudentsJoined: newTotal,
        }).catch(() => {});
      } catch {
        // Notification failure must NEVER fail user onboarding
      }
    }

    return this.getPublicStats().studentsJoined;
  }
}
