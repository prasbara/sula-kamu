import { NextRequest, NextResponse } from 'next/server';
import { supportContributionService } from '@/src/services/support/supportContributionService';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest) {
  try {
    const qrisConfig = await supportContributionService.getQrisConfig();
    return NextResponse.json({
      success: true,
      qris: qrisConfig
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat konfigurasi QRIS.' },
      { status: 500 }
    );
  }
}
