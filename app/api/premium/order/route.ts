import { NextRequest, NextResponse } from 'next/server';
import { PremiumService } from '@/src/services/premium/premiumService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { planId, contactName, contactEmail, contactTelegram, userNote } = body;

    if (!planId) {
      return NextResponse.json(
        { success: false, error: 'Paket langganan harus dipilih.' },
        { status: 400 }
      );
    }

    const result = PremiumService.createOrder({
      planId,
      contactName,
      contactEmail,
      contactTelegram,
      userNote,
    });

    return NextResponse.json({
      success: true,
      order: {
        publicOrderId: result.order.public_order_id,
        amount: result.order.amount,
        formattedAmount: PremiumService.formatRupiah(result.order.amount),
        currency: result.order.currency,
        status: result.order.status,
        planName: result.plan.name,
        durationDays: result.plan.duration_days,
        createdAt: result.order.created_at,
      },
      payment: {
        method: result.payment.payment_method,
        status: result.payment.verification_status,
      },
      ticket: {
        id: result.ticketId,
        accessToken: result.ticketAccessToken,
        chatUrl: `/support/ticket/${result.ticketId}?token=${result.ticketAccessToken}`,
      },
      qris: result.qrisInfo,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal membuat pesanan Premium.' },
      { status: 400 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Parameter orderId diperlukan.' },
        { status: 400 }
      );
    }

    const details = PremiumService.getOrderByPublicId(orderId);
    if (!details) {
      return NextResponse.json(
        { success: false, error: 'Pesanan tidak ditemukan.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      order: {
        publicOrderId: details.order.public_order_id,
        amount: details.order.amount,
        formattedAmount: PremiumService.formatRupiah(details.order.amount),
        status: details.order.status,
        planName: details.plan.name,
        durationDays: details.plan.duration_days,
        createdAt: details.order.created_at,
      },
      payment: {
        method: details.payment.payment_method,
        status: details.payment.verification_status,
        paidAt: details.payment.paid_at,
        hasProof: !!details.payment.proof_data,
        rejectionReason: details.payment.rejection_reason,
      },
      subscription: details.subscription ? {
        status: details.subscription.status,
        startedAt: details.subscription.started_at,
        expiresAt: details.subscription.expires_at,
      } : null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal memuat status pesanan.' },
      { status: 500 }
    );
  }
}
