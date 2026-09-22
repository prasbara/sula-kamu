import { NextRequest, NextResponse } from 'next/server';
import { StrangerChatService } from '@/src/services/stranger/strangerChatService';
import { ModerationCategory } from '@/src/types/index';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, userId, action, reason, details, category } = body;

    if (!sessionId || !userId || !action) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'sessionId, userId, and action are required.' },
        { status: 400 }
      );
    }

    if (action === 'SKIP') {
      const result = StrangerChatService.skip(sessionId, userId);
      return NextResponse.json(result);
    }

    if (action === 'BLOCK') {
      const result = StrangerChatService.block(sessionId, userId, reason);
      return NextResponse.json(result);
    }

    if (action === 'REPORT') {
      const reportCategory: ModerationCategory = category || 'OTHER';
      const result = StrangerChatService.report(sessionId, userId, reportCategory, details || reason);
      return NextResponse.json(result);
    }

    if (action === 'END') {
      StrangerChatService.terminateSession(sessionId, `ENDED_BY_${userId}`);
      return NextResponse.json({ success: true, message: 'Percakapan diakhiri.' });
    }

    return NextResponse.json(
      { error: 'INVALID_ACTION', message: 'Action must be SKIP, BLOCK, REPORT, or END.' },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: 'SESSION_ACTION_ERROR', message: err.message || 'Gagal memproses aksi sesi.' },
      { status: 400 }
    );
  }
}
