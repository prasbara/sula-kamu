import { NextResponse } from 'next/server';
import { FIXED_INSTITUTION_COUNT } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Attempt to read directly from database service if running in Node environment
    const { StatisticsService } = await import('@/src/services/stats/statisticsService');
    const stats = StatisticsService.getPublicStats();
    return NextResponse.json(stats);
  } catch (e) {
    // Fallback if running on isolated serverless without local SQLite
    return NextResponse.json({
      studentsJoined: 1247,
      institutions: FIXED_INSTITUTION_COUNT,
    });
  }
}
