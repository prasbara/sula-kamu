import { NextRequest, NextResponse } from 'next/server';
import { SupportService } from '@/src/services/support/supportService';
import { MatchingService } from '@/src/services/matchmaking/matchingService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = req.cookies.get('niva_user_token')?.value;
  if (!userId) {
    return NextResponse.json({ error: 'UNAUTHORIZED: Silakan masuk melalui tautan resmi Telegram NIVA' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const requestedTicketId = searchParams.get('ticketId');

  try {
    let ticketId = requestedTicketId;
    if (!ticketId) {
      const { ticket } = SupportService.getOrCreatePremiumTicket(userId);
      ticketId = ticket.id;
    }

    const details = SupportService.getTicketDetails(ticketId, userId, false);
    const likesAllowance = MatchingService.getDailyLikesRemaining(userId);

    return NextResponse.json({
      success: true,
      ticket: details.ticket,
      messages: details.messages,
      queuePosition: details.queuePosition,
      userProfile: details.userProfile,
      likesUsage: likesAllowance,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memuat tiket bantuan' }, { status: 400 });
  }
}
