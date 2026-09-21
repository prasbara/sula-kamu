import { NextRequest, NextResponse } from 'next/server';
import { StrangerCamService } from '@/src/services/stranger/strangerCamService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, senderId, receiverId, signalType, payload } = body;

    if (!sessionId || !senderId || !signalType || !payload) {
      return NextResponse.json(
        { error: 'INVALID_SIGNAL', message: 'sessionId, senderId, signalType, and payload are required.' },
        { status: 400 }
      );
    }

    const result = StrangerCamService.sendSignal(
      sessionId,
      senderId,
      signalType,
      typeof payload === 'string' ? payload : JSON.stringify(payload),
      receiverId
    );

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'SIGNAL_ERROR', message: err.message || 'Gagal mengirimkan signal WebRTC.' },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');
    const receiverId = url.searchParams.get('receiverId');
    const after = url.searchParams.get('after') || undefined;

    if (!sessionId || !receiverId) {
      return NextResponse.json(
        { error: 'INVALID_QUERY', message: 'sessionId and receiverId are required.' },
        { status: 400 }
      );
    }

    const signals = StrangerCamService.getSignals(sessionId, receiverId, after);
    return NextResponse.json({ signals });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'SIGNAL_FETCH_ERROR', message: err.message || 'Gagal mengambil signal WebRTC.' },
      { status: 400 }
    );
  }
}
