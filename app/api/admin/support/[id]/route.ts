import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/src/services/auth/adminAuthService';
import { SupportService } from '@/src/services/support/supportService';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const token = req.cookies.get('niva_admin_token')?.value;
  const session = token ? AdminAuthService.validateSession(token) : null;

  if (!session || !AdminAuthService.hasRole(session.role, ['SUPPORT_ADMIN', 'SUPER_ADMIN', 'AUDITOR'])) {
    return NextResponse.json({ error: 'FORBIDDEN: Akses khusus Support Admin' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const details = SupportService.getTicketDetails(id, undefined, true);
    return NextResponse.json({ success: true, details });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Tiket tidak ditemukan' }, { status: 404 });
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const token = req.cookies.get('niva_admin_token')?.value;
  const session = token ? AdminAuthService.validateSession(token) : null;

  if (!session || !AdminAuthService.hasRole(session.role, ['SUPPORT_ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'FORBIDDEN: Akses khusus Support Admin' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const { body, isInternal } = await req.json();
    if (!body) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong' }, { status: 400 });
    }

    const message = SupportService.sendMessage(
      id,
      'ADMIN',
      session.adminId,
      session.displayName,
      body,
      Boolean(isInternal)
    );

    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal mengirim pesan' }, { status: 400 });
  }
}
