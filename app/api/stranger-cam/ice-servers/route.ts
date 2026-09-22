import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const stunUrls = (process.env.STUN_URLS || 'stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302,stun:stun.cloudflare.com:3478')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const iceServers: RTCIceServer[] = [
    { urls: stunUrls },
  ];

  if (process.env.TURN_URLS && process.env.TURN_USERNAME && process.env.TURN_CREDENTIAL) {
    const turnUrls = process.env.TURN_URLS.split(',').map((u) => u.trim()).filter(Boolean);
    iceServers.push({
      urls: turnUrls,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    });
  } else {
    // Metered openrelay fallback for NAT traversal / restrictive networks
    iceServers.push({
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    });
  }

  return NextResponse.json({
    iceServers,
    iceCandidatePoolSize: 10,
  });
}
