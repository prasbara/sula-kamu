import { NextRequest, NextResponse } from 'next/server';
import { StrangerCamService } from '@/src/services/stranger/strangerCamService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, interests } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'User ID diperlukan.' },
        { status: 401 }
      );
    }

    if (action === 'LEAVE') {
      StrangerCamService.leaveQueue(userId);
      return NextResponse.json({ success: true, message: 'Keluar dari antrean.' });
    }

    if (action === 'POLL') {
      const activeSession = StrangerCamService.getActiveSessionForUser(userId);
      if (activeSession) {
        return NextResponse.json({
          success: true,
          status: 'CONNECTED',
          message: 'Match ditemukan! Menghubungkan video 1-on-1...',
          session: activeSession,
        });
      }
      return NextResponse.json({
        success: true,
        status: 'QUEUED',
        message: 'Mencari mahasiswa lain di Semarang yang sedang online...',
      });
    }

    // Default action: JOIN
    const result = StrangerCamService.joinQueue(userId, interests);
    if (!result.success) {
      if (result.status === 'ALREADY_IN_SESSION' && (result as any).session) {
        return NextResponse.json({
          success: true,
          status: 'CONNECTED',
          message: 'Match ditemukan! Menghubungkan video 1-on-1...',
          session: (result as any).session,
        });
      }
      const statusCode = result.status === 'FEATURE_UNAVAILABLE' ? 503 : 400;
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'QUEUE_ERROR', message: err.message || 'Gagal memproses antrean.' },
      { status: 400 }
    );
  }
}
