import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { PaymentService } = await import('@/src/services/payment/paymentService');
    const plans = PaymentService.getPlans();
    return NextResponse.json({ plans });
  } catch (e) {
    return NextResponse.json({
      plans: [
        {
          id: 'early_access',
          name: 'Early Access',
          price: 5000,
          duration_days: 30,
          badge_label: 'EARLY ACCESS',
          is_active: 1,
        },
        {
          id: 'early_launch',
          name: 'Early Launch',
          price: 8000,
          duration_days: 30,
          badge_label: 'EARLY LAUNCH',
          is_active: 1,
        },
      ],
    });
  }
}
