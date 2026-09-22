import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/src/services/auth/adminAuthService';
import { StrikeService } from '@/src/services/safety/strikeService';
import { config } from '@/src/config/index';
import { ModerationSeverity } from '@/src/types/index';

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
    const url = new URL(req.url);
    const severityParam = url.searchParams.get('severity') as ModerationSeverity | null;
    const filterSeverity = severityParam && ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].includes(severityParam)
      ? severityParam
      : undefined;

    const events = StrikeService.getModerationQueue(filterSeverity);

    // Summary counts by severity
    const criticalCount = events.filter((e) => e.severity === 'CRITICAL').length;
    const highCount = events.filter((e) => e.severity === 'HIGH').length;
    const mediumCount = events.filter((e) => e.severity === 'MEDIUM').length;
    const lowCount = events.filter((e) => e.severity === 'LOW').length;

    return NextResponse.json({
      success: true,
      counts: {
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
        total: events.length,
      },
      events,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'QUEUE_FETCH_ERROR', message: err.message },
      { status: 500 }
    );
  }
}
