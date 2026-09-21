import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/src/services/auth/adminAuthService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const token = req.cookies.get('niva_admin_token')?.value;
  if (token) {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    AdminAuthService.logout(token, ip);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.delete('niva_admin_token');
  return response;
}
