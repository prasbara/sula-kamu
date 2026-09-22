import { NextRequest, NextResponse } from 'next/server';
import { SupportService } from '@/src/services/support/supportService';
import { getDatabase } from '@/src/database/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const { ticketId, body, token, senderName } = payload;
    const headerToken = req.headers.get('x-ticket-token');
    const effectiveToken = token || headerToken;
    const userId = req.cookies.get('niva_user_token')?.value;

    if (!ticketId || !body) {
      return NextResponse.json({ error: 'ticketId dan body wajib diisi' }, { status: 400 });
    }

    // 1. If access token provided (Web / guest user with ticket token)
    if (effectiveToken) {
      const message = SupportService.sendMessageWithToken(
        ticketId,
        effectiveToken,
        senderName || 'Pengguna NIVA',
        body
      );
      return NextResponse.json({ success: true, message });
    }

    // 2. If authenticated user session exists
    if (userId) {
      const db = getDatabase();
      const profile = db.prepare('SELECT display_name FROM profiles WHERE user_id = ?').get(userId) as { display_name: string } | undefined;
      const finalSenderName = senderName || profile?.display_name || 'Pengguna NIVA';

      // Verify ownership inside getTicketDetails
      SupportService.getTicketDetails(ticketId, userId, false);

      const message = SupportService.sendMessage(
        ticketId,
        'USER',
        userId,
        finalSenderName,
        body,
        false
      );

      return NextResponse.json({ success: true, message });
    }

    return NextResponse.json(
      { error: 'UNAUTHORIZED: Sesi tidak valid atau token akses tidak disertakan.' },
      { status: 401 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal mengirim pesan' }, { status: 400 });
  }
}
