import { NextRequest, NextResponse } from 'next/server';
import { StrangerChatService } from '@/src/services/stranger/strangerChatService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, interests } = body;

    if (!userId) {
      return NextResponse.json({ error: 'INVALID_REQUEST', message: 'userId is required.' }, { status: 400 });
    }

    if (action === 'ENTER') {
      const result = StrangerChatService.enterQueue(userId, Array.isArray(interests) ? interests : []);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'LEAVE') {
      const result = StrangerChatService.leaveQueue(userId);
      return NextResponse.json({ ...result });
    }

    return NextResponse.json({ error: 'INVALID_ACTION', message: 'action must be ENTER or LEAVE.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'QUEUE_ERROR', message: err.message || 'Gagal memproses antrean obrolan.' },
      { status: 400 }
    );
  }
}
