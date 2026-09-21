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
    console.error('Failed to fetch public statistics:', e);
    // Never fallback to 1247 or fake numbers
    return NextResponse.json({
      studentsJoined: null,
      institutions: FIXED_INSTITUTION_COUNT,
      error: 'Data temporarily unavailable',
    }, { status: 503 });
  }
}
