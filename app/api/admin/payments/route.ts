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

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get('status') || 'ALL';

  const rawQueue = PaymentService.getPaymentQueue(statusFilter);
  const normalized = rawQueue.map((item: any) => ({
    id: item.payment_id,
    payment_id: item.payment_id,
    user_id: item.user_id,
    user_name: item.display_name || 'Mahasiswa Semarang',
    display_name: item.display_name || 'Mahasiswa Semarang',
    institution_name: item.institution_short_name || 'Semarang Higher-Ed',
    institution_short_name: item.institution_short_name || 'Semarang',
    plan_tier: item.plan_name,
    plan_name: item.plan_name,
    amount: item.amount,
    payment_method: item.payment_method,
    proof_file_path: item.proof_image_path || item.storage_key || (item.proof_data ? `data:${item.mime_type || 'image/jpeg'};base64,${item.proof_data}` : ''),
    status: item.status,
    created_at: item.proof_submitted_at || item.created_at,
    notes: item.review_notes,
    verification_status: item.verification_status,
    subscription_status: item.subscription_status,
  }));

  return NextResponse.json({ queue: normalized, payments: normalized });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('niva_admin_token')?.value;
  const session = token ? AdminAuthService.validateSession(token) : null;

  if (!session || !AdminAuthService.hasRole(session.role, ['PAYMENT_ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'FORBIDDEN: Akses khusus Payment Admin' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const paymentId = body.paymentId || body.payment_id;
    const rawAction = (body.action || '').toUpperCase();
    const action = rawAction === 'APPROVE' ? 'APPROVE' : 'REJECT';
    const notes = body.notes || body.rejection_reason || '';

    if (!paymentId) {
      return NextResponse.json({ error: 'paymentId wajib diisi' }, { status: 400 });
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
