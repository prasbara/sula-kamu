import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/src/services/auth/adminAuthService';
import { getDatabase } from '@/src/database/db';
import { StatisticsService } from '@/src/services/stats/statisticsService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('niva_admin_token')?.value;
  const session = token ? AdminAuthService.validateSession(token) : null;

  if (!session) {
    return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
  }

  const db = getDatabase();
  const stats = StatisticsService.getPublicStats();

  const totalActiveUsers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'ACTIVE'").get() as any).count;
  const photoVerified = (db.prepare("SELECT COUNT(*) as count FROM users WHERE verification_status = 'PHOTO_VERIFIED'").get() as any).count;
  const ktmVerified = (db.prepare("SELECT COUNT(*) as count FROM users WHERE verification_status = 'KTM_VERIFIED'").get() as any).count;
  const freeUsers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE subscription_status = 'FREE'").get() as any).count;
  const premiumUsers = (db.prepare("SELECT COUNT(*) as count FROM users WHERE subscription_status = 'PREMIUM_ACTIVE'").get() as any).count;
  
  const pendingKtm = (db.prepare("SELECT COUNT(*) as count FROM student_verifications WHERE status = 'PENDING'").get() as any).count;
  const pendingPhoto = (db.prepare("SELECT COUNT(*) as count FROM photo_verifications WHERE status = 'PHOTO_PENDING'").get() as any).count;
  let pendingPremPay = 0;
  try {
    pendingPremPay = (db.prepare("SELECT COUNT(*) as count FROM premium_payments WHERE verification_status IN ('PENDING', 'UNDER_REVIEW')").get() as any)?.count || 0;
  } catch {}
  const pendingLegacyPay = (db.prepare("SELECT COUNT(*) as count FROM payment_requests WHERE status IN ('UNDER_REVIEW', 'PENDING')").get() as any)?.count || 0;
  const pendingPayments = pendingLegacyPay + pendingPremPay;

  const openTickets = (db.prepare("SELECT COUNT(*) as count FROM support_tickets WHERE status IN ('OPEN', 'WAITING', 'IN_PROGRESS')").get() as any).count;
  const openReports = (db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'OPEN'").get() as any).count;

  // Real-time matchmaking and presence observability metrics
  const currentlyOnline = (db.prepare("SELECT COUNT(*) as count FROM users WHERE datetime(last_seen_at) >= datetime('now', '-15 minutes')").get() as any).count;
  const searchingCount = (db.prepare("SELECT COUNT(*) as count FROM match_queue WHERE status = 'SEARCHING'").get() as any).count;
  const activeChats = (db.prepare("SELECT COUNT(*) as count FROM match_sessions WHERE status = 'ACTIVE'").get() as any).count;
  const completedSessions = (db.prepare("SELECT COUNT(*) as count FROM match_sessions WHERE status = 'COMPLETED'").get() as any).count;

  // New modules metrics
  let pendingReviews = 0;
  try {
    pendingReviews = (db.prepare("SELECT COUNT(*) as count FROM reviews WHERE status = 'PENDING_REVIEW'").get() as any)?.count || 0;
  } catch {}

  let pendingAdInquiries = 0;
  try {
    pendingAdInquiries = (db.prepare("SELECT COUNT(*) as count FROM advertising_inquiries WHERE status = 'NEW'").get() as any)?.count || 0;
  } catch {}

  let pendingModeration = 0;
  try {
    pendingModeration = (db.prepare("SELECT COUNT(*) as count FROM moderation_events WHERE review_status = 'PENDING'").get() as any)?.count || 0;
  } catch {}

  let activeStrangerCam = 0;
  try {
    activeStrangerCam = (db.prepare("SELECT COUNT(*) as count FROM stranger_sessions WHERE status IN ('SEARCHING', 'WAITING', 'CONNECTED')").get() as any)?.count || 0;
  } catch {}

  return NextResponse.json({
    metrics: {
      studentsJoinedTotal: stats.studentsJoined,
      totalActiveUsers,
      photoVerified,
      ktmVerified,
      freeUsers,
      premiumUsers,
      pendingVerifications: pendingKtm + pendingPhoto,
      pendingKtm,
      pendingPhoto,
      pendingPayments,
      openTickets,
      openReports,
      // Matchmaking & Presence
      currentlyOnline,
      searchingCount,
      activeChats,
      completedSessions,
      // Operational Queues
      pendingReviews,
      pendingAdInquiries,
      pendingModeration,
      activeStrangerCam,
    },
    admin: session,
  });
}
