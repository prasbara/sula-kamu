import { NextRequest, NextResponse } from 'next/server';
import { AdminAuthService } from '@/src/services/auth/adminAuthService';
import { PhotoVerificationService } from '@/src/services/verification/photoVerificationService';
import { VerificationService } from '@/src/services/verification/verificationService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('niva_admin_token')?.value;
  const session = token ? AdminAuthService.validateSession(token) : null;

  if (!session || !AdminAuthService.hasRole(session.role, ['VERIFICATION_ADMIN', 'SUPER_ADMIN', 'AUDITOR'])) {
    return NextResponse.json({ error: 'FORBIDDEN: Akses khusus Verification Admin' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'ALL';

  const photoQueue = (type === 'ALL' || type === 'PHOTO') ? PhotoVerificationService.getPhotoQueue() : [];
  const ktmQueue = (type === 'ALL' || type === 'KTM') ? VerificationService.getReviewQueue() : [];

  return NextResponse.json({ photoQueue, ktmQueue });
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('niva_admin_token')?.value;
  const session = token ? AdminAuthService.validateSession(token) : null;

  if (!session || !AdminAuthService.hasRole(session.role, ['VERIFICATION_ADMIN', 'SUPER_ADMIN'])) {
    return NextResponse.json({ error: 'FORBIDDEN: Akses khusus Verification Admin' }, { status: 403 });
  }

  try {
    const { verificationType, id, action, notes } = await req.json();

    if (verificationType === 'PHOTO') {
      PhotoVerificationService.resolvePhotoVerification(id, action, session.adminId, notes);
      return NextResponse.json({ success: true, message: `Verifikasi foto ${action === 'APPROVE' ? 'disetujui' : 'ditolak'}` });
    } else {
      VerificationService.resolveManualReview(id, action === 'APPROVE' ? 'APPROVE' : 'REJECT', session.adminId, notes);
      return NextResponse.json({ success: true, message: `Verifikasi KTM ${action === 'APPROVE' ? 'disetujui' : 'ditolak'}` });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal memproses verifikasi' }, { status: 400 });
  }
}
