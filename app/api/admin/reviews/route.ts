import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AdminAuthService } from '@/src/services/auth/adminAuthService';
import { ReviewService } from '@/src/services/review/reviewService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('niva_admin_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = AdminAuthService.validateSession(token);
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'ALL';

    const queue = ReviewService.getAdminReviewQueue(status);
    return NextResponse.json({ queue });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('niva_admin_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const session = AdminAuthService.validateSession(token);
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 });

    // RBAC check: MODERATOR or SUPER_ADMIN or SUPPORT_ADMIN can moderate/respond to reviews
    if (!AdminAuthService.hasRole(session.role, ['SUPER_ADMIN', 'MODERATOR', 'SUPPORT_ADMIN'])) {
      return NextResponse.json({ error: 'FORBIDDEN: Anda tidak memiliki izin mengelola ulasan.' }, { status: 403 });
    }

    const body = await req.json();
    const { review_id, action, reason, admin_response } = body;

    if (!review_id || !['APPROVE', 'REJECT', 'RESPOND', 'HIDE', 'FLAG'].includes(action)) {
      return NextResponse.json({ error: 'Aksi atau ID ulasan tidak valid.' }, { status: 400 });
    }

    ReviewService.moderateReview(review_id, action, session.adminId, {
      reason,
      adminResponse: admin_response,
    });

    return NextResponse.json({ success: true, message: `Aksi ${action} berhasil diterapkan pada ulasan.` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 400 });
  }
}
