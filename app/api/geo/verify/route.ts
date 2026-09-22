import { NextRequest, NextResponse } from 'next/server';
import { GeolocationService } from '@/src/services/geo/geolocationService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, sessionId } = body;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        {
          allowed: false,
          locationVerified: false,
          locationStatus: 'LOCATION_DENIED',
          error: 'UNAUTHORIZED',
          message: 'User ID diperlukan.',
        },
        { status: 401 }
      );
    }

    const lat = body.latitude !== undefined ? Number(body.latitude) : (body.coords?.latitude !== undefined ? Number(body.coords.latitude) : NaN);
    const lon = body.longitude !== undefined ? Number(body.longitude) : (body.coords?.longitude !== undefined ? Number(body.coords.longitude) : NaN);
    const accuracy = body.accuracy !== undefined ? Number(body.accuracy) : (body.coords?.accuracy !== undefined ? Number(body.coords.accuracy) : undefined);
    const timestamp = body.timestamp !== undefined ? Number(body.timestamp) : (body.coords?.timestamp !== undefined ? Number(body.coords.timestamp) : Date.now());

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      return NextResponse.json(
        {
          allowed: false,
          region: 'UNKNOWN',
          locationStatus: 'LOCATION_REQUIRED',
          locationVerified: false,
          error: 'COORDINATES_REQUIRED',
          message: 'Izin lokasi browser dan koordinat GPS diperlukan.',
        },
        { status: 400 }
      );
    }

    const verification = GeolocationService.verifyLocation({
      userId: userId.trim(),
      latitude: lat,
      longitude: lon,
      accuracy,
      timestamp,
      sessionId,
    });

    if (!verification.allowed) {
      return NextResponse.json(
        {
          allowed: false,
          region: verification.region,
          locationStatus: verification.locationStatus,
          locationVerified: false,
          reason: verification.reason || 'OUTSIDE_ALLOWED_REGION',
          boundaryVersion: verification.boundaryVersion,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      allowed: true,
      region: verification.region,
      locationStatus: verification.locationStatus,
      locationVerified: true,
      expiresAt: verification.expiresAt,
      boundaryVersion: verification.boundaryVersion,
      message: 'Lokasi terverifikasi di wilayah ' + (verification.region === 'CITY_SEMARANG' ? 'Kota Semarang' : 'Kabupaten Semarang') + '.',
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        allowed: false,
        region: 'UNKNOWN',
        locationStatus: 'LOCATION_DENIED',
        locationVerified: false,
        error: 'LOCATION_VERIFY_FAILED',
        message: err.message || 'Gagal memverifikasi lokasi.',
      },
      { status: 500 }
    );
  }
}
