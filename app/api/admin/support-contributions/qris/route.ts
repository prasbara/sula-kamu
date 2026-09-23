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

export async function GET(_req: NextRequest) {
  try {
    const admin = await authenticateAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const config = await supportContributionService.getQrisConfig();
    return NextResponse.json({ success: true, qris: config });
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
    const { image_data, account_name, instructions } = body;

    const updated = await supportContributionService.updateQrisConfig(
      {
        image_data,
        account_name,
        instructions
      },
      admin.adminId
    );

    return NextResponse.json({ success: true, qris: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message || 'Gagal memperbarui konfigurasi QRIS.' }, { status: 400 });
  }
}
