import { NextRequest, NextResponse } from 'next/server';
import { WaitlistService } from '@/src/services/waitlist/waitlistService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { contactInfo, userId } = body;

    if (!contactInfo || typeof contactInfo !== 'string') {
      return NextResponse.json(
        { error: 'INVALID_INPUT', message: 'Kontak Telegram atau Email wajib diisi.' },
        { status: 400 }
      );
    }

    const result = WaitlistService.joinWaitlist(contactInfo, 'NIVA_DATING', userId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'WAITLIST_ERROR', message: err.message || 'Gagal mendaftar waitlist.' },
      { status: 400 }
    );
  }
}

export async function GET() {
  try {
    const count = WaitlistService.getWaitlistCount('NIVA_DATING');
    return NextResponse.json({
      feature: 'NIVA_DATING',
      waitlistCount: count,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'FETCH_ERROR', message: err.message },
      { status: 500 }
    );
  }
}
