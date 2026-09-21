import { NextRequest, NextResponse } from 'next/server';
import { SupportService } from '@/src/services/support/supportService';
import { getDatabase } from '@/src/database/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const userId = req.cookies.get('niva_user_token')?.value;
  if (!userId) {
    return NextResponse.json({ error: 'UNAUTHORIZED: Silakan masuk melalui Telegram' }, { status: 401 });
  }

  try {
    const { ticketId, body } = await req.json();
    if (!ticketId || !body) {
      return NextResponse.json({ error: 'ticketId dan body wajib diisi' }, { status: 400 });
    }

    const db = getDatabase();
    const profile = db.prepare('SELECT display_name FROM profiles WHERE user_id = ?').get(userId) as { display_name: string } | undefined;
    const senderName = profile?.display_name || 'Pengguna NIVA';

    // Verify ownership inside getTicketDetails
    SupportService.getTicketDetails(ticketId, userId, false);

    const message = SupportService.sendMessage(
      ticketId,
      'USER',
      userId,
      senderName,
      body,
      false
    );

    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal mengirim pesan' }, { status: 400 });
  }
}
