import { NextRequest, NextResponse } from 'next/server';
import { StrangerChatService } from '@/src/services/stranger/strangerChatService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, senderId, content } = body;

    if (!sessionId || !senderId || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'sessionId, senderId, and content are required.' },
        { status: 400 }
      );
    }

    const result = StrangerChatService.sendMessage(sessionId, senderId, content);

    return NextResponse.json({
      success: result.success,
      messageId: result.messageId,
      deliveredContent: result.deliveredContent,
      isRedacted: result.isRedacted,
      moderationResult: {
        action: result.moderationResult.action,
        severity: result.moderationResult.severity,
        riskScore: result.moderationResult.riskScore,
        flags: result.moderationResult.flags,
        warningMessage: result.moderationResult.warningMessage,
      },
      enforcementNotice: result.enforcementNotice,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'MESSAGE_SEND_ERROR', message: err.message || 'Gagal mengirim pesan.' },
      { status: 400 }
    );
  }
}
