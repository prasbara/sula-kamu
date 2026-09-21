import { NextRequest, NextResponse } from 'next/server';
import { StrangerCamService } from '@/src/services/stranger/strangerCamService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, sessionId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'UNAUTHORIZED', message: 'User ID is required.' }, { status: 401 });
    }

    StrangerCamService.recordHeartbeat(userId, sessionId);

    let sessionInfo = null;
    if (sessionId) {
      try {
        sessionInfo = StrangerCamService.getSessionInfo(sessionId, userId);
      } catch {
        // Session may have ended or not found
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      session: sessionInfo,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'HEARTBEAT_ERROR', message: err.message || 'Gagal merekam heartbeat.' },
      { status: 400 }
    );
  }
}
