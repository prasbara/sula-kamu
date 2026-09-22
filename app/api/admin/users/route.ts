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
  const q = searchParams.get('q')?.trim() || '';
  const filter = searchParams.get('filter') || 'ALL';

  const db = getDatabase();
  const today = new Date().toISOString().split('T')[0];

  let sql = `
    SELECT 
      u.id as user_id,
      u.telegram_id,
      u.telegram_username,
      u.telegram_display_name,
      u.bot_state,
      u.online_status,
      u.last_seen_at,
      u.status as account_status,
      u.verification_status,
      u.subscription_status,
      u.created_at as joined_date,
      u.updated_at as last_active,
      u.risk_score,
      coalesce(p.display_name, u.telegram_display_name, 'Pengguna NIVA') as display_name,
      p.study_field,
      p.age,
      i.name as institution_name,
      i.short_name as institution_short_name,
      coalesce(dlu.like_count, 0) as daily_likes_used,
      (SELECT COUNT(*) FROM reports WHERE reported_id = u.id) as report_count
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    LEFT JOIN institutions i ON i.id = p.institution_id
    LEFT JOIN daily_like_usage dlu ON dlu.user_id = u.id AND dlu.usage_date = '${today}'
    WHERE u.status != 'DELETED'
  `;

  if (filter === 'FREE') sql += " AND u.subscription_status = 'FREE'";
  else if (filter === 'PREMIUM') sql += " AND u.subscription_status = 'PREMIUM_ACTIVE'";
  else if (filter === 'PHOTO_ONLY') sql += " AND u.verification_status = 'PHOTO_VERIFIED'";
  else if (filter === 'KTM_VERIFIED') sql += " AND u.verification_status = 'KTM_VERIFIED'";
  else if (filter === 'PAYMENT_PENDING') sql += " AND (u.id IN (SELECT user_id FROM payment_requests WHERE status = 'UNDER_REVIEW') OR u.id IN (SELECT user_id FROM premium_orders WHERE status = 'PENDING'))";
  else if (filter === 'VERIFICATION_PENDING') sql += " AND u.verification_status IN ('PHOTO_PENDING', 'KTM_PENDING')";
  else if (filter === 'SUSPENDED') sql += " AND u.status = 'SUSPENDED'";

  const params: any[] = [];
  if (q) {
    sql += ` AND (u.id LIKE ? OR p.display_name LIKE ? OR u.telegram_username LIKE ? OR i.name LIKE ? OR i.short_name LIKE ?)`;
    const searchPattern = `%${q}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern, searchPattern);
  }

  sql += ' ORDER BY u.created_at DESC LIMIT 100';

  const users = db.prepare(sql).all(...params);
  return NextResponse.json({ users });
}
