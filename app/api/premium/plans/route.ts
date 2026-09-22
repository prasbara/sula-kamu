import { NextResponse } from 'next/server';
import { PremiumService } from '@/src/services/premium/premiumService';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const plans = PremiumService.getPlans();
    return NextResponse.json({
      success: true,
      plans: plans.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        formattedPrice: PremiumService.formatRupiah(p.price),
        durationDays: p.duration_days,
        description: p.description,
        features: p.features,
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat paket langganan.' },
      { status: 500 }
    );
  }
}
