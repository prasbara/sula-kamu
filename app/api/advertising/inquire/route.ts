import { NextRequest, NextResponse } from 'next/server';
import { AdvertisingService } from '@/src/services/advertising/advertisingService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      companyName,
      contactName,
      contactEmail,
      contactPhone,
      campaignType,
      budgetRange,
      targetAudience,
      message,
      honeypot, // anti-spam bot trap
    } = body;

    // Silent reject if bot filled honeypot
    if (honeypot) {
      return NextResponse.json({ success: true, message: 'Permintaan berhasil dikirim.' });
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    const inquiry = AdvertisingService.createInquiry({
      companyName,
      contactName,
      contactEmail,
      contactPhone,
      campaignType,
      budgetRange,
      targetAudience,
      message,
      ipAddress,
    });

    return NextResponse.json({
      success: true,
      message: 'Terima kasih! Tim kemitraan NIVA telah menerima permohonan kerjasama Anda dan akan menghubungi kontak tertera.',
      inquiryId: inquiry.id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal mengirimkan formulir permohonan.' },
      { status: 400 }
    );
  }
}
