import { NextRequest, NextResponse } from 'next/server';
import { SupportService } from '@/src/services/support/supportService';
import { MatchingService } from '@/src/services/matchmaking/matchingService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const requestedTicketId = searchParams.get('ticketId') || searchParams.get('id');
  const token = searchParams.get('token') || req.headers.get('x-ticket-token');
  const userId = req.cookies.get('niva_user_token')?.value;

  try {
    // 1. Token-based access (IDOR protected for web / guest users)
    if (requestedTicketId && token) {
      const details = SupportService.getTicketByToken(requestedTicketId, token);
      return NextResponse.json({
        success: true,
        ticket: details.ticket,
        messages: details.messages,
        queuePosition: details.queuePosition,
      });
    }

    // 2. Authenticated user session access (e.g. via Telegram bridge)
    if (userId) {
      let ticketId = requestedTicketId;
      if (!ticketId) {
        const { ticket } = SupportService.getOrCreatePremiumTicket(userId);
        ticketId = ticket.id;
      }

      const details = SupportService.getTicketDetails(ticketId, userId, false);
      let likesAllowance: any = 0;
      try {
        likesAllowance = MatchingService.getDailyLikesRemaining(userId);
      } catch {}

      return NextResponse.json({
        success: true,
        ticket: details.ticket,
        messages: details.messages,
        queuePosition: details.queuePosition,
        userProfile: details.userProfile,
        likesUsage: likesAllowance,
      });
    }

    return NextResponse.json(
      { error: 'UNAUTHORIZED: Masukkan token akses tiket atau masuk melalui akun terverifikasi.' },
      { status: 401 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memuat tiket bantuan' }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, subject, message, contactName, contactEmail, priority, environment } = body;

    const userId = req.cookies.get('niva_user_token')?.value;

    const result = SupportService.createUnifiedTicket({
      category: category || 'GENERAL',
      subject: subject || '',
      message: message || '',
      contactName,
      contactEmail,
      userId,
      priority,
      environment: environment || 'PRODUCTION',
    });

    return NextResponse.json({
      success: true,
      ticket: result.ticket,
      accessToken: result.accessToken,
      initialMessage: result.initialMessage,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal membuat tiket bantuan' }, { status: 400 });
  }
}
