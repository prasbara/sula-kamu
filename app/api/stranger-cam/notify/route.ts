import { NextRequest, NextResponse } from 'next/server';
import { StrangerCamService } from '@/src/services/stranger/strangerCamService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contactInfo, userId } = body;

    if (!contactInfo || typeof contactInfo !== 'string') {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Kontak Telegram atau email diperlukan.' },
        { status: 400 }
      );
    }

    const result = StrangerCamService.joinWaitlist(contactInfo, userId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'WAITLIST_ERROR', message: err.message || 'Gagal mendaftar waitlist.' },
      { status: 400 }
    );
  }
}
