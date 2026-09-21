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
    // Authenticate user via cookie
    const cookieStore = await cookies();
    const userId = cookieStore.get('niva_user_token')?.value;

    if (!userId) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED: Silakan masuk melalui bot Telegram NIVA untuk mengirimkan ulasan terverifikasi.' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { rating, reviewText, recommend, improvementCategory } = body;

    const review = ReviewService.submitReview({
      userId,
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
