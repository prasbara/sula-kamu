import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/src/services/auth/adminAuthService';
import { ModerationService } from '@/src/services/safety/moderationService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('niva_admin_token')?.value;
  const session = token ? AdminAuthService.validateSession(token) : null;

  if (!session || !AdminAuthService.hasRole(session.role, ['MODERATOR', 'SUPER_ADMIN', 'AUDITOR'])) {
    return NextResponse.json({ error: 'FORBIDDEN: Akses khusus Moderator atau Super Admin' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || 'ALL';
  const category = searchParams.get('category') || 'ALL';
  const search = searchParams.get('q') || '';

  try {
    const reports = ModerationService.getReportsWithDetails(status, category, search);

    const counts = {
      all: reports.length,
      open: reports.filter((r) => r.status === 'OPEN').length,
      underInvestigation: reports.filter((r) => r.status === 'UNDER_INVESTIGATION').length,
      resolved: reports.filter((r) => r.status === 'RESOLVED').length,
      dismissed: reports.filter((r) => r.status === 'DISMISSED').length,
    };

    return NextResponse.json({ success: true, reports, counts });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memuat antrean laporan' }, { status: 500 });
  }
}
