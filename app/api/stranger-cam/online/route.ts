import { NextRequest, NextResponse } from 'next/server';
import { StrangerCamService } from '@/src/services/stranger/strangerCamService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    if (userId) {
      try {
        StrangerCamService.recordHeartbeat(userId);
      } catch {}
    }
    const onlineCount = StrangerCamService.getOnlineStrangerCount();
    return NextResponse.json({ success: true, onlineCount });
  } catch (err: any) {
    return NextResponse.json({ success: false, onlineCount: 0 }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { userId } = body;
    if (userId) {
      try {
        StrangerCamService.recordHeartbeat(userId);
      } catch {}
    }
    const onlineCount = StrangerCamService.getOnlineStrangerCount();
    return NextResponse.json({ success: true, onlineCount });
  } catch (err: any) {
    return NextResponse.json({ success: false, onlineCount: 0 }, { status: 500 });
  }
}
