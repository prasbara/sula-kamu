import { NextRequest, NextResponse } from 'next/server';
import { StrangerCamService, ReportReason } from '@/src/services/stranger/strangerCamService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, sessionId, userId, targetUserId, reason, details } = body;

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Session ID dan User ID diperlukan.' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'SKIP': {
        const res = StrangerCamService.skipCall(sessionId, userId);
        return NextResponse.json(res);
      }
      case 'BLOCK': {
        if (!targetUserId) {
          return NextResponse.json({ error: 'MISSING_TARGET', message: 'Target user ID diperlukan.' }, { status: 400 });
        }
        const res = StrangerCamService.blockUser(sessionId, userId, targetUserId);
        return NextResponse.json(res);
      }
      case 'REPORT': {
        if (!targetUserId || !reason) {
          return NextResponse.json({ error: 'MISSING_DATA', message: 'Target user ID dan alasan laporan diperlukan.' }, { status: 400 });
        }
        const res = StrangerCamService.reportUser(sessionId, userId, targetUserId, reason as ReportReason, details);
        return NextResponse.json(res);
      }
      case 'END': {
        const res = StrangerCamService.endCall(sessionId, userId);
        return NextResponse.json(res);
      }
      default:
        return NextResponse.json({ error: 'UNKNOWN_ACTION', message: 'Aksi tidak dikenali.' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: 'ACTION_FAILED', message: err.message || 'Gagal memproses aksi sesi.' },
      { status: 400 }
    );
  }
}
