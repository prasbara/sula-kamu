import { NextRequest, NextResponse } from 'next/server';
import { PremiumService } from '@/src/services/premium/premiumService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let publicOrderId = '';
    let userNote = '';
    let ticketId = '';
    let ticketAccessToken = '';
    let proofBuffer: Buffer | undefined;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      publicOrderId = (formData.get('publicOrderId') as string) || '';
      userNote = (formData.get('userNote') as string) || '';
      ticketId = (formData.get('ticketId') as string) || '';
      ticketAccessToken = (formData.get('ticketAccessToken') as string) || '';

      const file = formData.get('proofFile') as File | null;
      if (file && file.size > 0) {
        const arrayBuffer = await file.arrayBuffer();
        proofBuffer = Buffer.from(arrayBuffer);
      }
    } else {
      const body = await req.json();
      publicOrderId = body.publicOrderId;
      userNote = body.userNote;
      ticketId = body.ticketId;
      ticketAccessToken = body.ticketAccessToken;
      if (body.proofBase64) {
        const base64Data = body.proofBase64.replace(/^data:image\/\w+;base64,/, '');
        proofBuffer = Buffer.from(base64Data, 'base64');
      }
    }

    if (!publicOrderId) {
      return NextResponse.json(
        { success: false, error: 'Nomor order (publicOrderId) diperlukan.' },
        { status: 400 }
      );
    }

    const result = await PremiumService.confirmPayment({
      publicOrderId,
      userNote,
      proofBuffer,
      ticketId,
      ticketAccessToken,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Gagal mengonfirmasi pembayaran.' },
      { status: 400 }
    );
  }
}
