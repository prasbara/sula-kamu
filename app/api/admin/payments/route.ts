import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/src/services/auth/adminAuthService';
import { PaymentService } from '@/src/services/payment/paymentService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('niva_admin_token')?.value;
  const session = token ? AdminAuthService.validateSession(token) : null;

  if (!session || !AdminAuthService.hasRole(session.role, ['PAYMENT_ADMIN', 'SUPER_ADMIN', 'AUDITOR'])) {
    return NextResponse.json({ error: 'FORBIDDEN: Akses khusus Payment Admin' }, { status: 403 });
  }

  const queue = PaymentService.getPaymentQueue();
  return NextResponse.json({ queue });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('niva_admin_token')?.value;
  const session = token ? AdminAuthService.validateSession(token) : null;

  if (!session || !AdminAuthService.hasRole(session.role, ['PAYMENT_ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'FORBIDDEN: Akses khusus Payment Admin' }, { status: 403 });
  }

  try {
    const { paymentId, action, notes } = await req.json();
    if (!paymentId || !action) {
      return NextResponse.json({ error: 'paymentId dan action wajib diisi' }, { status: 400 });
    }

    PaymentService.resolvePayment(paymentId, action, session.adminId, notes);
    return NextResponse.json({
      success: true,
      message: `Pembayaran ${action === 'APPROVE' ? 'disetujui dan paket premium diaktifkan' : 'ditolak'}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memproses pembayaran' }, { status: 400 });
  }
}
