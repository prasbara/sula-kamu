import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/src/services/auth/adminAuthService';
import { getDatabase } from '@/src/database/db';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const token = req.cookies.get('niva_admin_token')?.value;
  const session = token ? AdminAuthService.validateSession(token) : null;

  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const { id } = await params;
  const db = getDatabase();

  const user = db.prepare(`
    SELECT 
      u.id as user_id,
      u.status as account_status,
      u.verification_status,
      u.subscription_status,
      u.is_18_plus,
      u.risk_score,
      u.created_at,
      u.updated_at,
      p.display_name,
      p.age,
      p.study_field,
      p.bio,
      p.relationship_intent,
      p.coarse_area,
      i.name as institution_name,
      i.short_name as institution_short_name
    FROM users u
    LEFT JOIN profiles p ON p.user_id = u.id
    LEFT JOIN institutions i ON i.id = p.institution_id
    WHERE u.id = ?
  `).get(id);

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Payment history
  const payments = db.prepare(`
    SELECT id, plan_id, amount, payment_method, status, created_at, reviewed_at, review_notes
    FROM payment_requests
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(id);

  // Subscriptions
  const subscriptions = db.prepare(`
    SELECT id, plan_id, status, starts_at, ends_at, created_at
    FROM subscriptions
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(id);

  // Support tickets
  const tickets = db.prepare(`
    SELECT id, type, subject, status, priority, created_at, updated_at
    FROM support_tickets
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(id);

  // Reports
  const reports = db.prepare(`
    SELECT id, report_code, category, status, resolution_action, created_at
    FROM reports
    WHERE reported_id = ?
    ORDER BY created_at DESC
  `).all(id);

  // Audit actions targeting this user
  const audits = db.prepare(`
    SELECT id, actor_id, actor_role, action, details, created_at
    FROM audit_logs
    WHERE target_id = ? OR details LIKE '%${id}%'
    ORDER BY created_at DESC
    LIMIT 20
  `).all(id);

  return NextResponse.json({
    user,
    payments,
    subscriptions,
    tickets,
    reports,
    audits,
  });
}
