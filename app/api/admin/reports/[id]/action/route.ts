import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/src/services/auth/adminAuthService';
import { ModerationService } from '@/src/services/safety/moderationService';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const token = req.cookies.get('niva_admin_token')?.value;
  const session = token ? AdminAuthService.validateSession(token) : null;

  if (!session || !AdminAuthService.hasRole(session.role, ['MODERATOR', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'FORBIDDEN: Akses khusus Moderator atau Super Admin' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const { action, notes } = await req.json();

    if (!action || !['WARN', 'SUSPEND', 'BAN', 'DISMISS'].includes(action)) {
      return NextResponse.json({ error: 'Action tidak valid (harus WARN, SUSPEND, BAN, atau DISMISS)' }, { status: 400 });
    }

    ModerationService.resolveReport(id, session.adminId, action, notes || 'Ditindaklanjuti via Admin Dashboard');

    return NextResponse.json({
      success: true,
      message: `Laporan berhasil diproses dengan tindakan: ${action}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memproses laporan' }, { status: 500 });
  }
}
