import { NextRequest, NextResponse } from 'next/server';
import { SupportService } from '@/src/services/support/supportService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const dest = searchParams.get('dest') || 'support';

  if (!token) {
    return NextResponse.redirect(new URL('/?error=invalid_token', req.url));
  }

  try {
    const data = await SupportService.exchangeBridgeToken(token);
    const targetUrl = dest === 'checkout' 
      ? new URL('/premium', req.url)
      : new URL('/premium/support', req.url);

    if (data.targetTicketId) {
      targetUrl.searchParams.set('ticket', data.targetTicketId);
    }

    const response = NextResponse.redirect(targetUrl);

    // Set secure HttpOnly cookie for user session (expires in 7 days)
    response.cookies.set('niva_user_token', data.userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 3600,
    });

    return response;
  } catch (err: any) {
    const errorUrl = new URL('/premium/support', req.url);
    errorUrl.searchParams.set('error', err.message || 'Token kedaluwarsa');
    return NextResponse.redirect(errorUrl);
  }
}
