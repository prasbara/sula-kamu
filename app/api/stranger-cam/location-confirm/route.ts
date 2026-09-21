import { NextRequest, NextResponse } from 'next/server';
import { StrangerCamService } from '@/src/services/stranger/strangerCamService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, method, coords } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'User ID diperlukan.' },
        { status: 401 }
      );
    }

    const validMethods = ['BROWSER_GEO', 'USER_CONFIRMATION', 'IP_LOOKUP'];
    const selectedMethod = validMethods.includes(method) ? method : 'USER_CONFIRMATION';

    const result = StrangerCamService.confirmSemarangLocation(userId, selectedMethod, coords);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: 'LOCATION_CONFIRM_FAILED', message: err.message || 'Gagal mengonfirmasi lokasi.' },
      { status: 400 }
    );
  }
}
