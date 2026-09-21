import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'imageBase64 wajib diisi' }, { status: 400 });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-z]+;base64,/, '');
    const buffer = Buffer.from(cleanBase64, 'base64');

    const { PaymentService } = await import('@/src/services/payment/paymentService');
    await PaymentService.submitPaymentProof(id, buffer);

    return NextResponse.json({
      success: true,
      message: 'Bukti pembayaran berhasil diunggah dan masuk ke antrean FIFO admin.',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memproses bukti pembayaran' }, { status: 400 });
  }
}
