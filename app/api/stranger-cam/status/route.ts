import { NextResponse } from 'next/server';
import { StrangerCamService } from '@/src/services/stranger/strangerCamService';

export async function GET() {
  try {
    const launched = StrangerCamService.isFeatureLaunched();
    const waitlistCount = StrangerCamService.getWaitlistCount();

    return NextResponse.json({
      feature: 'NIVA_STRANGER_CAM',
      launched,
      state: 'COMING_SOON',
      title: 'NIVA Stranger Cam',
      headline: 'Meet a stranger. Start a conversation.',
      tagline: 'Meet someone new in Semarang.',
      region: 'Semarang',
      badges: ['18+ Only', 'Semarang Only', '1-on-1', 'Privacy First', 'Moderated'],
      waitlistCount,
      requirements: {
        minAge: 18,
        locationConfirmationRequired: true,
        region: 'SEMARANG',
        ktmVerificationRequired: false,
        photoVerificationRequired: false,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'STATUS_ERROR', message: err.message },
      { status: 500 }
    );
  }
}
