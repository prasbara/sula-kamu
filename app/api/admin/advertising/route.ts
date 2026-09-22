import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AdvertisingService, AdvertisingLeadStatus } from '@/src/services/advertising/advertisingService';
import { getDatabase } from '@/src/database/db';

export const dynamic = 'force-dynamic';

import { AdminAuthService } from '@/src/services/auth/adminAuthService';

async function authenticateAdmin(): Promise<{ adminId: string; role: string } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('niva_admin_token')?.value || cookieStore.get('niva_admin_session')?.value;
  if (!token) return null;

  const valid = AdminAuthService.validateSession(token);
  if (valid) {
    return { adminId: valid.adminId, role: valid.role };
  }

  const db = getDatabase();
  const session = db.prepare(`
    SELECT s.admin_id, u.role
    FROM admin_sessions s
    JOIN admin_users u ON u.id = s.admin_id
    WHERE s.token_hash = ? AND s.is_revoked = 0 AND datetime(s.expires_at) > datetime('now')
  `).get(token) as { admin_id: string; role: string } | undefined;

  if (!session) return null;
  return { adminId: session.admin_id, role: session.role };
}

export async function GET(req: NextRequest) {
  try {
    const admin = await authenticateAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'ALL';
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const result = AdvertisingService.getInquiries({ status, limit, offset });
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await authenticateAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    }

    const body = await req.json();
    const { inquiryId, status, internalNotes } = body;

    if (!inquiryId || !status) {
      return NextResponse.json({ error: 'Missing inquiryId or status' }, { status: 400 });
    }

    const updated = AdvertisingService.updateInquiryStatus({
      inquiryId,
      status: status as AdvertisingLeadStatus,
      adminId: admin.adminId,
      internalNotes,
    });

    return NextResponse.json({ success: true, inquiry: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 400 });
  }
}
