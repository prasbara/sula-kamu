import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AdminAuthService } from '@/src/services/auth/adminAuthService';
import { PremiumService } from '@/src/services/premium/premiumService';

export const dynamic = 'force-dynamic';

async function checkAdminAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get('niva_admin_token')?.value;
  if (!token) return null;
  return AdminAuthService.validateSession(token);
}

export async function GET(req: NextRequest) {
  const admin = await checkAdminAuth();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'ALL';
    const queue = PremiumService.getAdminQueue(status);

    return NextResponse.json({
      success: true,
      orders: queue.map(item => ({
        publicOrderId: item.order.public_order_id,
        userId: item.order.user_id,
        amount: item.order.amount,
        formattedAmount: PremiumService.formatRupiah(item.order.amount),
        planName: item.plan.name,
        durationDays: item.plan.duration_days,
        orderStatus: item.order.status,
        paymentStatus: item.payment.verification_status,
        paymentMethod: item.payment.payment_method,
        paidAt: item.payment.paid_at,
        proofData: item.payment.proof_data,
        userNote: item.payment.user_note,
        verifiedBy: item.payment.verified_by,
        verifiedAt: item.payment.verified_at,
        rejectionReason: item.payment.rejection_reason,
        createdAt: item.order.created_at,
      })),
      total: queue.length,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal memuat antrean pembayaran.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const admin = await checkAdminAuth();
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, publicOrderId, rejectionReason, adminNotes } = body;

    if (!publicOrderId) {
      return NextResponse.json({ error: 'publicOrderId diperlukan' }, { status: 400 });
    }

    if (action === 'APPROVE') {
      const result = PremiumService.adminApproveOrder({
        publicOrderId,
        adminId: admin.adminId,
        adminNotes,
      });
      return NextResponse.json({ success: true, result });
    } else if (action === 'REJECT') {
      if (!rejectionReason || !rejectionReason.trim()) {
        return NextResponse.json({ error: 'Alasan penolakan wajib dicantumkan.' }, { status: 400 });
      }
      const result = PremiumService.adminRejectOrder({
        publicOrderId,
        adminId: admin.adminId,
        rejectionReason,
      });
      return NextResponse.json({ success: true, result });
    } else {
      return NextResponse.json({ error: 'Action tidak valid (harus APPROVE atau REJECT).' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal memproses verifikasi.' },
      { status: 500 }
    );
  }
}
