import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { getDatabase } = await import('@/src/database/db');
    const db = getDatabase();

    const payment = db.prepare(`
      SELECT pr.*, sp.name as plan_name, sp.badge_label 
      FROM payment_requests pr
      JOIN subscription_plans sp ON sp.id = pr.plan_id
      WHERE pr.id = ?
    `).get(id);

    if (!payment) {
      return NextResponse.json({ error: 'Payment request not found' }, { status: 404 });
    }

    return NextResponse.json({ payment });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Gagal mengambil status pembayaran' }, { status: 500 });
  }
}
