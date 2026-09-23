import { NextRequest, NextResponse } from 'next/server';
import { SupportContributionService } from '@/src/services/support/supportContributionService';
import { ServerlessRateLimiter } from '@/src/services/security/serverlessRateLimiter';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
    const rateCheck = ServerlessRateLimiter.checkLimit(`support_create:${ip}`, 15, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Terlalu banyak permintaan. Silakan tunggu 1 menit.' },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { amount, proofData, proofMimeType, donorName, donorEmail, note, userId } = body;

    const result = SupportContributionService.createContribution({
      amount,
      proofData,
      proofMimeType,
      donorName,
      donorEmail,
      note,
      userId,
    });

    return NextResponse.json({
      success: true,
      contribution: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengirimkan bukti dukungan.' },
      { status: 400 }
    );
  }
}
