import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/src/services/auth/adminAuthService';
import { getDatabase } from '@/src/database/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('niva_admin_token')?.value;
  const session = token ? AdminAuthService.validateSession(token) : null;

  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action')?.trim();

  const db = getDatabase();
  let sql = 'SELECT * FROM audit_logs';
  const params: any[] = [];
  if (action) {
    sql += ' WHERE action LIKE ?';
    params.push(`%${action}%`);
  }
  sql += ' ORDER BY created_at DESC LIMIT 100';
  const logs = db.prepare(sql).all(...params);

  return NextResponse.json({ logs });
}
