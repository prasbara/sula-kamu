import { NextRequest, NextResponse } from 'next/server';
import { StrangerChatService } from '@/src/services/stranger/strangerChatService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');
    const userId = url.searchParams.get('userId');
    const after = url.searchParams.get('after') || undefined;

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'INVALID_QUERY', message: 'sessionId and userId are required.' },
        { status: 400 }
      );
    }

    const messages = StrangerChatService.getMessages(sessionId, userId, after);
    return NextResponse.json({ success: true, messages });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'FETCH_MESSAGES_ERROR', message: err.message || 'Gagal mengambil pesan.' },
      { status: 400 }
    );
  }
}
