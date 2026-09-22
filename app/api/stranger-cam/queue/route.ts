import { NextRequest, NextResponse } from 'next/server';
import { StrangerCamService } from '@/src/services/stranger/strangerCamService';
import { GeolocationService } from '@/src/services/geo/geolocationService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, interests } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'User ID diperlukan.' },
        { status: 401 }
      );
    }

    if (action === 'LEAVE') {
      StrangerCamService.leaveQueue(userId);
      return NextResponse.json({ success: true, message: 'Keluar dari antrean.' });
    }

    // ── Strict Location Gate Check (HTTP 403 if unverified, outside, or stale) ──
    const locStatus = GeolocationService.isUserLocationFresh(userId);
    if (!locStatus.verified) {
      StrangerCamService.leaveQueue(userId);
      return NextResponse.json(
        {
          success: false,
          status: locStatus.locationStatus,
          error: 'LOCATION_VERIFICATION_REQUIRED',
          message: locStatus.reason || 'Izin dan konfirmasi lokasi di wilayah Kota atau Kabupaten Semarang diperlukan sebelum masuk matchmaking.',
        },
        { status: 403 }
      );
    }

    if (action === 'POLL') {
      const activeSession = StrangerCamService.getActiveSessionForUser(userId);
      if (activeSession) {
        return NextResponse.json({
          success: true,
          status: 'CONNECTED',
          message: 'Match ditemukan! Menghubungkan video 1-on-1...',
          session: activeSession,
        });
      }

      return NextResponse.json({
        success: true,
        status: 'QUEUED',
        message: 'Mencari pengguna lain di Semarang yang sedang online...',
      });
    }

    // Default action: JOIN
    const result = StrangerCamService.joinQueue(userId, interests);
    if (!result.success) {
      if (result.status === 'ALREADY_IN_SESSION' && (result as any).session) {
        return NextResponse.json({
          success: true,
          status: 'CONNECTED',
          message: 'Match ditemukan! Menghubungkan video 1-on-1...',
          session: (result as any).session,
        });
      }
      const statusCode = result.status === 'FEATURE_UNAVAILABLE' ? 503 : (result.status === 'INELIGIBLE' ? 403 : 400);
      return NextResponse.json(result, { status: statusCode });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'QUEUE_ERROR', message: err.message || 'Gagal memproses antrean.' },
      { status: 400 }
    );
  }
}
