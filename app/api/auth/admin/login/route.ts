import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/src/services/auth/adminAuthService';
import { ServerlessRateLimiter } from '@/src/services/security/serverlessRateLimiter';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateCheck = ServerlessRateLimiter.checkLimit(`admin_login:${ip}`, 10, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: 'Terlalu banyak percobaan login. Silakan tunggu 1 menit.' }, { status: 429 });
    }

    const body = await req.json();
    const { username, password, totpCode } = body;

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }

    const userAgent = req.headers.get('user-agent') || 'Unknown';

    const { token, admin } = await AdminAuthService.login(
      username.trim(),
      password,
      totpCode?.trim(),
      ip,
      userAgent
    );

    const response = NextResponse.json({ success: true, admin });

    // Set secure HttpOnly cookie
    response.cookies.set('niva_admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 12 * 3600, // 12 hours
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Otentikasi gagal' }, { status: 401 });
  }
}
