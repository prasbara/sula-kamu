import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getDatabase } from '@/src/database/db';
import { AdminAuthService } from '@/src/services/auth/adminAuthService';
import { supportContributionService } from '@/src/services/support/supportContributionService';

export const dynamic = 'force-dynamic';

async function authenticateAdmin(): Promise<{ adminId: string; role: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('niva_admin_token')?.value || cookieStore.get('niva_admin_session')?.value;
  if (!token) return null;

  const valid = AdminAuthService.validateSession(token);
  if (valid) {
    return { adminId: valid.adminId, role: valid.role };
  }

  try {
    const db = getDatabase();
    const session = db.prepare(`
      SELECT s.admin_id, u.role
      FROM admin_sessions s
      JOIN admin_users u ON u.id = s.admin_id
      WHERE s.token_hash = ? AND s.is_revoked = 0 AND datetime(s.expires_at) > datetime('now')
    `).get(token) as { admin_id: string; role: string } | undefined;

    if (!session) return null;
    return { adminId: session.admin_id, role: session.role };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const admin = await authenticateAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const data = await supportContributionService.getAdminContributions({ status, limit, offset });
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await authenticateAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await req.json();
    const { action, contributionId, reason } = body;

    if (!action || !contributionId) {
      return NextResponse.json(
        { success: false, error: 'Parameter action dan contributionId wajib disertakan.' },
        { status: 400 }
      );
    }

    if (action === 'VERIFY') {
      const updated = await supportContributionService.verifyContribution(contributionId, admin.adminId);
      return NextResponse.json({ success: true, contribution: updated });
    } else if (action === 'REJECT') {
      if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
        return NextResponse.json(
          { success: false, error: 'Alasan penolakan (reason) wajib diisi.' },
          { status: 400 }
        );
      }
      const updated = await supportContributionService.rejectContribution(contributionId, admin.adminId, reason.trim());
      return NextResponse.json({ success: true, contribution: updated });
    } else {
      return NextResponse.json(
        { success: false, error: `Aksi ${action} tidak dikenali. Pilih VERIFY atau REJECT.` },
        { status: 400 }
      );
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Gagal memproses aksi support.' }, { status: 400 });
  }
}
