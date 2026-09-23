import { NextRequest, NextResponse } from 'next/server';
import { supportContributionService } from '@/src/services/support/supportContributionService';
import { ServerlessRateLimiter } from '@/src/services/security/serverlessRateLimiter';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || '127.0.0.1';
  const rl = ServerlessRateLimiter.checkLimit(`support_status_${ip}`, 30, 60);
  if (!rl.allowed) {
    return NextResponse.json(
      { success: false, error: 'Terlalu banyak permintaan status. Silakan coba sebentar lagi.' },
      { status: 429 }
    );
  }

  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code')?.trim();

  if (!code) {
    return NextResponse.json(
      { success: false, error: 'Kode Support ID wajib disertakan.' },
      { status: 400 }
    );
  }

  try {
    const contribution = await supportContributionService.getContributionByCode(code);
    if (!contribution) {
      return NextResponse.json(
        { success: false, error: `Support ID ${code} tidak ditemukan.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      contribution: {
        support_code: contribution.support_code,
        amount: contribution.amount,
        payment_method: contribution.payment_method,
        status: contribution.status,
        donor_name: contribution.donor_name || 'Teman NIVA',
        note: contribution.note || null,
        created_at: contribution.created_at,
        verified_at: contribution.verified_at || null,
        rejection_reason: contribution.rejection_reason || null
      }
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memeriksa status support.' },
      { status: 500 }
    );
  }
}
