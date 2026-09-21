import { NextRequest, NextResponse } from 'next/server';
import { StrangerCamService } from '@/src/services/stranger/strangerCamService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const sessionId = url.searchParams.get('sessionId');
    const userId = url.searchParams.get('userId');

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: 'INVALID_QUERY', message: 'sessionId and userId are required.' },
        { status: 400 }
      );
    }

    const sessionInfo = StrangerCamService.getSessionInfo(sessionId, userId);
    return NextResponse.json(sessionInfo);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'SESSION_NOT_FOUND', message: err.message || 'Sesi tidak ditemukan.' },
      { status: 404 }
    );
  }
}
