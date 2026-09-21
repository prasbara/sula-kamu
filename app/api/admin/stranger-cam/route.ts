import { NextResponse } from 'next/server';
import { StrangerCamService } from '@/src/services/stranger/strangerCamService';
import { getDatabase } from '@/src/database/db';

export async function GET() {
  try {
    const stats = StrangerCamService.getAdminStats();
    const db = getDatabase();

    // Fetch recent reports with reporter/reported user info (no raw video)
    const recentReports = db.prepare(`
      SELECT 
        sr.id,
        sr.session_id,
        sr.reporter_id,
        sr.reported_user_id,
        sr.reason,
        sr.details,
        sr.status,
        sr.created_at
      FROM stranger_reports sr
      ORDER BY sr.created_at DESC
      LIMIT 20
    `).all();

    // Fetch recent waitlist signups
    const recentWaitlist = db.prepare(`
      SELECT id, contact_info, created_at
      FROM feature_waitlist
      WHERE feature = 'STRANGER_CAM'
      ORDER BY created_at DESC
      LIMIT 20
    `).all();

    return NextResponse.json({
      stats,
      recentReports,
      recentWaitlist,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'ADMIN_ERROR', message: err.message },
      { status: 500 }
    );
  }
}
