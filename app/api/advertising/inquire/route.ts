import { NextRequest, NextResponse } from 'next/server';
import { AdvertisingService } from '@/src/services/advertising/advertisingService';
import { SupportService } from '@/src/services/support/supportService';

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

    // Also bridge inquiry into unified support ticket so admin can chat/follow-up in Support Queue
    let ticket: any = null;
    try {
      ticket = SupportService.createUnifiedTicket({
        category: 'ADVERTISING',
        subject: `[Kemitraan & Iklan] ${companyName} (${campaignType})`,
        message: `Detail Permohonan Kemitraan / Iklan:
Nama Brand / Perusahaan: ${companyName}
Nama PIC: ${contactName}
Email Resmi: ${contactEmail}
Nomor Telepon/WA: ${contactPhone || '-'}
Format Promosi: ${campaignType}
Estimasi Anggaran: ${budgetRange || 'Belum ditentukan'}
Target Audiens: ${targetAudience || 'Mahasiswa Semarang'}

Rincian Rencana Promosi / Pesan:
${message}`,
        contactName: `${contactName} (${companyName})`,
        contactEmail: contactEmail,
        priority: 'HIGH',
      });
    } catch (e) {
      console.error('Failed to bridge advertising inquiry to ticket:', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Terima kasih! Tim kemitraan NIVA telah menerima permohonan kerjasama Anda dan telah dimasukkan ke Antrean Admin Dashboard.',
      inquiryId: inquiry.id,
      ticketId: ticket ? ticket.id : null,
      accessToken: ticket ? ticket.accessToken : null,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Gagal mengirimkan formulir permohonan.' },
      { status: 400 }
    );
  }
}
