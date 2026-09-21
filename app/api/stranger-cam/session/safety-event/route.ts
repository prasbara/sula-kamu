import { NextRequest, NextResponse } from 'next/server';
import { StrangerCamService } from '@/src/services/stranger/strangerCamService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, userId, eventType, reason } = body;

    if (!userId || !eventType) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'userId and eventType are required.' },
        { status: 400 }
      );
    }

    const result = StrangerCamService.logSafetyEvent({
      sessionId,
      userId,
      eventType,
      reason,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'SAFETY_EVENT_FAILED', message: err.message || 'Gagal merekam safety event.' },
      { status: 400 }
    );
  }
}
