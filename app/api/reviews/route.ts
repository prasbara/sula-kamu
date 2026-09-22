import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ReviewService } from '@/src/services/review/reviewService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const data = ReviewService.getPublicReviews(limit, offset, 'PRODUCTION');
    const stats = ReviewService.getReviewStats('PRODUCTION');

    return NextResponse.json({
      reviews: data.reviews,
      total: data.total,
      stats,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memuat ulasan.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const tokenUserId = cookieStore.get('niva_user_token')?.value;

    const body = await req.json();
    const {
      userId: bodyUserId,
      displayName,
      institutionId,
      rating,
      reviewText,
      recommend,
      improvementCategory,
      consentTerms,
      honeypot,
    } = body;

    // Bot trap check
    if (honeypot) {
      return NextResponse.json({
        success: true,
        message: 'Ulasan Anda berhasil dikirim dan sedang menunggu verifikasi moderasi singkat oleh tim NIVA.',
      });
    }

    if (consentTerms === false) {
      return NextResponse.json(
        { error: 'Anda harus menyetujui ketentuan pedoman komunitas ulasan NIVA.' },
        { status: 400 }
      );
    }

    const effectiveUserId = tokenUserId || bodyUserId || undefined;

    const review = ReviewService.submitReview({
      userId: effectiveUserId,
      displayName: displayName ? String(displayName).trim() : undefined,
      institutionId: institutionId ? String(institutionId) : undefined,
      rating,
      reviewText,
      recommend: recommend !== false,
      improvementCategory,
      environment: 'PRODUCTION',
    });

    return NextResponse.json({
      success: true,
      message: 'Ulasan Anda berhasil dikirim dan sedang menunggu verifikasi moderasi singkat oleh tim NIVA.',
      review,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal mengirim ulasan.' }, { status: 400 });
  }
}
