import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, planId, paymentMethod } = body;

    if (!userId || !planId) {
      return NextResponse.json({ error: 'userId dan planId wajib diisi' }, { status: 400 });
    }

    const { PaymentService } = await import('@/src/services/payment/paymentService');
    const payment = PaymentService.createPaymentRequest(userId, planId, paymentMethod || 'QRIS');

    return NextResponse.json({ success: true, payment });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal membuat tagihan pembayaran' }, { status: 400 });
  }
}
