import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/src/services/auth/adminAuthService';
import { SupportService } from '@/src/services/support/supportService';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const token = req.cookies.get('niva_admin_token')?.value;
  const session = token ? AdminAuthService.validateSession(token) : null;

  if (!session || !AdminAuthService.hasRole(session.role, ['SUPPORT_ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'FORBIDDEN: Akses khusus Support Admin' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const { status, notes } = await req.json();
    if (!status) {
      return NextResponse.json({ error: 'status wajib diisi' }, { status: 400 });
    }

    SupportService.updateTicketStatus(id, status, session.adminId, notes);
    return NextResponse.json({ success: true, message: `Status tiket diubah menjadi ${status}` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal mengubah status' }, { status: 400 });
  }
}
