import { NextRequest, NextResponse } from 'next/server';
import { ModerationService } from '@/src/services/safety/moderationService';
import { IdentityService } from '@/src/services/identity/identityService';
import { getDatabase } from '@/src/database/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { reporterId, reportedIdentifier, category, evidenceText, evidenceMediaId } = body;

    if (!reportedIdentifier || !reportedIdentifier.trim()) {
      return NextResponse.json({ error: 'Pengguna yang dilaporkan wajib diisi.' }, { status: 400 });
    }

    if (!category) {
      return NextResponse.json({ error: 'Kategori laporan wajib dipilih.' }, { status: 400 });
    }

    // Resolve reported user through IdentityService (Internal ID, Telegram ID, or Username)
    const resolved = IdentityService.resolveUserByAnyIdentifier(reportedIdentifier);
    let targetUserId = resolved ? resolved.userId : null;
    let reportedUsernameSnapshot = resolved ? resolved.currentUsername : reportedIdentifier.replace(/^@/, '');

    const db = getDatabase();

    // If not found in users table, check if it's already a valid user ID or create an anchor record
    if (!targetUserId) {
      const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(reportedIdentifier.trim()) as { id: string } | undefined;
      if (existingUser) {
        targetUserId = existingUser.id;
      } else {
        // Fallback: search profile display_name
        const profile = db.prepare('SELECT user_id FROM profiles WHERE display_name LIKE ?').get(`%${reportedIdentifier.trim()}%`) as { user_id: string } | undefined;
        if (profile) {
          targetUserId = profile.user_id;
        }
      }
    }

    if (!targetUserId) {
      return NextResponse.json({
        error: 'PENGGUNA_TIDAK_DITEMUKAN: Pengguna yang dilaporkan tidak ditemukan dalam sistem.',
      }, { status: 404 });
    }

    // Ensure reporter ID or default system reporter
    const finalReporterId = reporterId || 'anonymous_reporter';
    // Ensure reporter exists in users or fallback
    const reporterExists = db.prepare('SELECT id FROM users WHERE id = ?').get(finalReporterId);
    if (!reporterExists) {
      // Create guest reporter anchor if needed
      db.prepare("INSERT OR IGNORE INTO users (id, telegram_id, status) VALUES (?, ?, 'PENDING_VERIFICATION')")
        .run(finalReporterId, `tg_anon_${Date.now()}`);
    }

    // Map categories cleanly
    let mappedCategory = category.toUpperCase().replace(/\s+/g, '_');
    const validCategories = [
      'SCAM', 'FRAUD', 'SEXUAL_HARASSMENT', 'HARASSMENT',
      'THREAT', 'SPAM', 'IMPERSONATION', 'FAKE_IDENTITY', 'INAPPROPRIATE_CONTENT', 'OTHER'
    ];
    if (!validCategories.includes(mappedCategory)) {
      if (mappedCategory.includes('SEXUAL')) mappedCategory = 'SEXUAL_HARASSMENT';
      else if (mappedCategory.includes('SCAM') || mappedCategory.includes('FRAUD')) mappedCategory = 'SCAM';
      else mappedCategory = 'OTHER';
    }

    const report = ModerationService.createReport({
      reporterUserId: finalReporterId,
      reportedUserId: targetUserId,
      category: mappedCategory as any,
      evidenceText: evidenceText || '',
      evidenceMediaId: evidenceMediaId || undefined,
      reportedUsernameAtTime: reportedUsernameSnapshot || undefined,
    });

    return NextResponse.json({
      success: true,
      reportCode: report.report_code,
      message: 'Laporan Anda telah berhasil dicatat dan masuk ke antrean moderasi NIVA.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal membuat laporan' }, { status: 500 });
  }
}
