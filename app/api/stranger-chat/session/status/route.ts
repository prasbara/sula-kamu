import { NextRequest, NextResponse } from 'next/server';
import { StrangerChatService } from '@/src/services/stranger/strangerChatService';
import { StrikeService } from '@/src/services/safety/strikeService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId') || req.cookies.get('stranger_user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'INVALID_QUERY', message: 'userId is required.' }, { status: 400 });
    }

    const activeSession = StrangerChatService.getActiveSession(userId);
    const restriction = StrikeService.getUserRestriction(userId);

    return NextResponse.json({
      success: true,
      hasActiveSession: Boolean(activeSession),
      session: activeSession
        ? {
            id: activeSession.id,
            status: activeSession.status,
            startedAt: activeSession.started_at,
            partnerAlias: 'Stranger',
          }
        : null,
      restriction,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'STATUS_ERROR', message: err.message || 'Gagal memeriksa status sesi.' },
      { status: 400 }
    );
  }
}
