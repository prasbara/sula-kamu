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
  const pendingPayments = (db.prepare("SELECT COUNT(*) as count FROM payment_requests WHERE status = 'UNDER_REVIEW'").get() as any).count;
  const openTickets = (db.prepare("SELECT COUNT(*) as count FROM support_tickets WHERE status IN ('OPEN', 'WAITING', 'IN_PROGRESS')").get() as any).count;
  const openReports = (db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'OPEN'").get() as any).count;

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
    },
    admin: session,
  });
}
