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
    const { status, priority, assignedAdminId, notes } = await req.json();

    if (status) {
      SupportService.updateTicketStatus(id, status, session.adminId, notes);
    }
    if (priority) {
      SupportService.updateTicketPriority(id, priority, session.adminId);
    }
    if (assignedAdminId !== undefined) {
      SupportService.assignTicket(id, assignedAdminId, session.adminId);
    }

    return NextResponse.json({ success: true, message: `Tiket ${id} berhasil diperbarui` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memperbarui tiket' }, { status: 400 });
  }
}
