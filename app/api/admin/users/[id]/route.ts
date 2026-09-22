import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/src/services/auth/adminAuthService';
import { getDatabase } from '@/src/database/db';
import { IdentityService } from '@/src/services/identity/identityService';

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
      u.telegram_id,
      u.telegram_username,
      u.telegram_display_name,
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

  // Identity history from telegram_identity_history
  const identityHistory = IdentityService.getIdentityHistory(id);

  // Student KTM Verifications
  const ktmVerifications = db.prepare(`
    SELECT id, institution_id, status, ocr_extracted_text, ocr_confidence, review_notes, reviewer_id, verified_at, expires_at, created_at
    FROM student_verifications
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(id);

  // Photo Verifications
  const photoVerifications = db.prepare(`
    SELECT id, status, review_notes, reviewer_id, created_at, updated_at
    FROM photo_verifications
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(id);

  // Premium Orders & Payments
  let premiumOrders: any[] = [];
  try {
    premiumOrders = db.prepare(`
      SELECT 
        po.id, po.public_order_id, po.plan_id, po.amount, po.status as order_status, po.created_at,
        pp.name as plan_name,
        pm.verification_status, pm.payment_method, pm.paid_at, pm.verified_by, pm.verified_at, pm.rejection_reason
      FROM premium_orders po
      LEFT JOIN premium_plans pp ON pp.id = po.plan_id
      LEFT JOIN premium_payments pm ON pm.order_id = po.id
      WHERE po.user_id = ?
      ORDER BY po.created_at DESC
    `).all(id);
  } catch {}

  // Active & Past Subscriptions
  let subscriptions: any[] = [];
  try {
    subscriptions = db.prepare(`
      SELECT ps.id, ps.plan_id, ps.status, ps.started_at, ps.expires_at, ps.created_at, pp.name as plan_name
      FROM premium_subscriptions ps
      LEFT JOIN premium_plans pp ON pp.id = ps.plan_id
      WHERE ps.user_id = ?
      ORDER BY ps.created_at DESC
    `).all(id);
  } catch {}

  // Support Tickets
  const tickets = db.prepare(`
    SELECT id, type, category, subject, status, priority, created_at, updated_at
    FROM support_tickets
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(id);

  // Reports filed AGAINST this user
  const reportsAgainst = db.prepare(`
    SELECT r.id, r.report_code, r.category, r.status, r.evidence_text, r.resolution_action, r.moderator_notes, r.created_at, r.reported_username_at_time,
           coalesce(p.display_name, 'Pelapor Mahasiswa') as reporter_display_name
    FROM reports r
    LEFT JOIN profiles p ON p.user_id = r.reporter_id
    WHERE r.reported_id = ?
    ORDER BY r.created_at DESC
  `).all(id);

  // Reports filed BY this user
  const reportsFiled = db.prepare(`
    SELECT r.id, r.report_code, r.category, r.status, r.resolution_action, r.created_at,
           coalesce(p.display_name, 'Pengguna') as reported_display_name
    FROM reports r
    LEFT JOIN profiles p ON p.user_id = r.reported_id
    WHERE r.reporter_id = ?
    ORDER BY r.created_at DESC
  `).all(id);

  // Audit actions targeting this user
  const audits = db.prepare(`
    SELECT id, actor_id, actor_role, action, details, created_at
    FROM audit_logs
    WHERE target_id = ? OR details LIKE ?
    ORDER BY created_at DESC
    LIMIT 30
  `).all(id, `%${id}%`);

  return NextResponse.json({
    user,
    identityHistory,
    ktmVerifications,
    photoVerifications,
    premiumOrders,
    subscriptions,
    tickets,
    reportsAgainst,
    reportsFiled,
    audits,
  });
}
