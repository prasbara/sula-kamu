import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/src/services/auth/adminAuthService';
import { StrangerCamService } from '@/src/services/stranger/strangerCamService';
import { config } from '@/src/config/index';

export const dynamic = 'force-dynamic';

function isAuthorizedAdmin(req: NextRequest): boolean {
  const token = req.cookies.get('niva_admin_token')?.value;
  if (token && AdminAuthService.validateSession(token)) {
    return true;
  }
  const apiKey = req.headers.get('x-api-key');
  if (apiKey && apiKey === config.ADMIN_API_KEY) {
    return true;
  }
  return false;
}

export async function GET(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const stats = StrangerCamService.getAdminStats();
    const liveSessions = StrangerCamService.getAdminLiveSessions();
    const reports = StrangerCamService.getAdminReports();
    const safetyEvents = StrangerCamService.getAdminSafetyEvents();

    return NextResponse.json({
      stats,
      liveSessions,
      reports,
      safetyEvents,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: err.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorizedAdmin(req)) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, reportId, adminNotes } = body;

    if (!reportId || !action) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'reportId and action are required.' },
        { status: 400 }
      );
    }

    if (!['RESOLVED', 'DISMISSED', 'BAN_USER'].includes(action)) {
      return NextResponse.json(
        { error: 'INVALID_ACTION', message: 'action must be RESOLVED, DISMISSED, or BAN_USER.' },
        { status: 400 }
      );
    }

    const result = StrangerCamService.resolveReport(reportId, action as any, adminNotes);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'MODERATION_ERROR', message: err.message || 'Gagal memproses moderasi.' },
      { status: 400 }
    );
  }
}
