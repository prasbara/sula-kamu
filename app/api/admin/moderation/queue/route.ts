import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/src/services/auth/adminAuthService';
import { StrikeService } from '@/src/services/safety/strikeService';
import { config } from '@/src/config/index';
import { ModerationSeverity } from '@/src/types/index';

export const dynamic = 'force-dynamic';

function getAuthorizedAdminRole(req: NextRequest): string | null {
  const token = req.cookies.get('niva_admin_token')?.value;
  if (token) {
    const session = AdminAuthService.validateSession(token);
    if (session) return session.role;
  }
  const apiKey = req.headers.get('x-api-key');
  if (apiKey && apiKey === config.ADMIN_API_KEY) {
    return 'SUPER_ADMIN';
  }
  return null;
}

export async function GET(req: NextRequest) {
  const role = getAuthorizedAdminRole(req);
  if (!role) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  if (!AdminAuthService.hasPermission(role as any, 'moderate_content') && role !== 'AUDITOR') {
    return NextResponse.json({ error: 'FORBIDDEN: Akses khusus Moderator, Auditor, atau Super Admin' }, { status: 403 });
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
