import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/src/services/auth/adminAuthService';
import { StrangerCamService } from '@/src/services/stranger/strangerCamService';
import { config } from '@/src/config/index';

export const dynamic = 'force-dynamic';

function getAdminUser(req: NextRequest): { authorized: boolean; adminId: string } {
  const token = req.cookies.get('niva_admin_token')?.value;
  if (token) {
    const session = AdminAuthService.validateSession(token);
    if (session) {
      return { authorized: true, adminId: session.adminId || 'admin_user' };
    }
  }
  const apiKey = req.headers.get('x-api-key');
  if (apiKey && apiKey === config.ADMIN_API_KEY) {
    return { authorized: true, adminId: 'admin_api_key' };
  }
  return { authorized: false, adminId: '' };
}

export async function GET(req: NextRequest) {
  const admin = getAdminUser(req);
  if (!admin.authorized) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const stats = StrangerCamService.getAdminStats();
    const databaseStats = StrangerCamService.getDatabaseStats();
    const liveSessions = StrangerCamService.getAdminLiveSessions();
    const reports = StrangerCamService.getAdminReports();
    const safetyEvents = StrangerCamService.getAdminSafetyEvents();
    const moderationTickets = StrangerCamService.getAdminModerationTickets();

    return NextResponse.json({
      stats: {
        ...stats,
        ...databaseStats,
      },
      liveSessions,
      reports,
      safetyEvents,
      moderationTickets,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const admin = getAdminUser(req);
  if (!admin.authorized) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, ticketId, reportId, adminNotes } = body;

    // 1. Handling Ticket Moderation Actions
    if (ticketId) {
      const allowedTicketActions = ['CONFIRMED', 'FALSE_POSITIVE', 'RESOLVED', 'UNDER_REVIEW', 'ESCALATED', 'BAN_USER'];
      if (!allowedTicketActions.includes(action)) {
        return NextResponse.json(
          { error: 'INVALID_ACTION', message: `Aksi tiket tidak valid. Pilih: ${allowedTicketActions.join(', ')}` },
          { status: 400 }
        );
      }

      const result = StrangerCamService.resolveModerationTicket(
        ticketId,
        action as any,
        admin.adminId,
        adminNotes
      );
      return NextResponse.json(result);
    }

    // 2. Handling Legacy Report Actions
    if (reportId) {
      if (!['RESOLVED', 'DISMISSED', 'BAN_USER'].includes(action)) {
        return NextResponse.json(
          { error: 'INVALID_ACTION', message: 'action must be RESOLVED, DISMISSED, or BAN_USER.' },
          { status: 400 }
        );
      }

      const result = StrangerCamService.resolveReport(reportId, action as any, adminNotes);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'INVALID_REQUEST', message: 'ticketId or reportId is required.' },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: 'MODERATION_ERROR', message: err.message || 'Gagal memproses moderasi.' },
      { status: 400 }
    );
  }
}
