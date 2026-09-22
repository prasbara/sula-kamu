import { NextRequest, NextResponse } from 'next/server';
import { StrangerChatService } from '@/src/services/stranger/strangerChatService';
import { GeolocationService } from '@/src/services/geo/geolocationService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, interests } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'INVALID_REQUEST', message: 'userId is required.' }, { status: 400 });
    }

    if (action === 'ENTER') {
      // Strict Location Gate Check (HTTP 403 if unverified, outside, or stale)
      const locStatus = GeolocationService.isUserLocationFresh(userId);
      if (!locStatus.verified) {
        return NextResponse.json(
          {
            error: 'LOCATION_VERIFICATION_REQUIRED',
            status: locStatus.locationStatus,
            message: locStatus.reason || 'Izin dan konfirmasi lokasi di wilayah Kota atau Kabupaten Semarang diperlukan sebelum masuk matchmaking Stranger Chat.',
          },
          { status: 403 }
        );
      }

      const result = StrangerChatService.enterQueue(userId, Array.isArray(interests) ? interests : []);
      return NextResponse.json({ success: true, ...result });
    }

    if (action === 'LEAVE') {
      const result = StrangerChatService.leaveQueue(userId);
      return NextResponse.json({ ...result });
    }

    return NextResponse.json({ error: 'INVALID_ACTION', message: 'action must be ENTER or LEAVE.' }, { status: 400 });
  } catch (err: any) {
    const isLocationError =
      err.message?.includes('lokasi') ||
      err.message?.includes('Semarang') ||
      err.message?.includes('syarat');
    return NextResponse.json(
      { error: 'QUEUE_ERROR', message: err.message || 'Gagal memproses antrean obrolan.' },
      { status: isLocationError ? 403 : 400 }
    );
  }
}
