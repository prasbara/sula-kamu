import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/src/services/auth/adminAuthService';
import { StrikeService } from '@/src/services/safety/strikeService';
import { config } from '@/src/config/index';

export const dynamic = 'force-dynamic';

function getAuthorizedAdminUser(req: NextRequest): { username: string; role: string } | null {
  const token = req.cookies.get('niva_admin_token')?.value;
  if (token) {
    const session = AdminAuthService.validateSession(token);
    if (session) return { username: session.username, role: session.role };
  }
  const apiKey = req.headers.get('x-api-key');
  if (apiKey && apiKey === config.ADMIN_API_KEY) {
    return { username: 'api_admin', role: 'SUPER_ADMIN' };
  }
  return null;
}

export async function POST(req: NextRequest) {
  const admin = getAuthorizedAdminUser(req);
  if (!admin) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { eventId, action, notes } = body;

    if (!eventId || !action) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'eventId and action are required.' },
        { status: 400 }
      );
    }

    if (!['DISMISS', 'RESOLVE', 'BAN_USER'].includes(action)) {
      return NextResponse.json(
        { error: 'INVALID_ACTION', message: 'action must be DISMISS, RESOLVE, or BAN_USER.' },
        { status: 400 }
      );
    }

    const result = StrikeService.resolveEvent(eventId, admin.username, action, notes);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'ACTION_FAILED', message: err.message },
      { status: 400 }
    );
  }
}
