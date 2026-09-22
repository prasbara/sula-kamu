import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/src/services/auth/adminAuthService';
import { SupportService } from '@/src/services/support/supportService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('niva_admin_token')?.value;
  const session = token ? AdminAuthService.validateSession(token) : null;

  if (!session || !AdminAuthService.hasRole(session.role, ['SUPPORT_ADMIN', 'SUPER_ADMIN', 'AUDITOR'])) {
    return NextResponse.json({ error: 'FORBIDDEN: Akses khusus Support Admin' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get('status') || 'ALL';
  const categoryFilter = searchParams.get('category') || 'ALL';
  const searchQuery = searchParams.get('q') || searchParams.get('search') || '';

  const queue = SupportService.getSupportQueue(statusFilter, categoryFilter, searchQuery);
  return NextResponse.json({ queue });
}
