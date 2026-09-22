import { NextRequest, NextResponse } from 'next/server';
import { TelegramService } from '@/src/services/telegram/telegramService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'userId wajib disertakan.' },
        { status: 400 }
      );
    }

    const result = TelegramService.createLinkToken(userId);

    return NextResponse.json({
      success: true,
      token: result.token,
      linkUrl: result.linkUrl,
      expiresAt: result.expiresAt,
    });
  } catch (err: any) {
    console.error('Error generating Telegram link token:', err);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: err.message || 'Gagal membuat tautan Telegram.' },
      { status: 500 }
    );
  }
}
