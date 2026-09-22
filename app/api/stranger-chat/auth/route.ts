import { NextRequest, NextResponse } from 'next/server';
import { StrangerCamService } from '@/src/services/stranger/strangerCamService';
import { StrikeService } from '@/src/services/safety/strikeService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, alias, confirmAge, is18Plus } = body;

    // 1. Get or create stranger user record
    const user = StrangerCamService.getOrCreateStrangerUser({
      userId,
      alias,
      is18Plus: is18Plus || confirmAge,
    });

    // 2. If client is specifically confirming 18+ gate
    if (confirmAge) {
      StrangerCamService.confirm18Plus(user.id);
      user.is18Plus = true;
    }

    // 3. Evaluate eligibility
    const eligibility = StrangerCamService.checkEligibility(user.id);

    // 4. Evaluate restrictions & active strikes
    const restriction = StrikeService.getUserRestriction(user.id);

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        displayName: user.displayName,
        is18Plus: user.is18Plus,
        isKtmVerified: user.isKtmVerified,
      },
      eligibility,
      restriction,
    });

    // Set cookie
    res.cookies.set('stranger_user_id', user.id, {
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      sameSite: 'lax',
    });

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { error: 'AUTH_FAILED', message: err.message || 'Gagal memproses autentikasi Stranger Chat.' },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const userIdCookie = req.cookies.get('stranger_user_id')?.value;
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId') || userIdCookie;

    if (!userId) {
      return NextResponse.json({ authenticated: false });
    }

    const user = StrangerCamService.getOrCreateStrangerUser({ userId });
    const eligibility = StrangerCamService.checkEligibility(user.id);
    const restriction = StrikeService.getUserRestriction(user.id);

    return NextResponse.json({
      authenticated: true,
      user,
      eligibility,
      restriction,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'AUTH_CHECK_FAILED', message: err.message },
      { status: 400 }
    );
  }
}
