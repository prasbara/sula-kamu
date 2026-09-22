import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import { AISupportService } from '@/src/services/ai/aiSupportService';
import { getDatabase } from '@/src/database/db';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

    // 1. Rate limiting check (15 queries per minute per IP)
    if (!AISupportService.checkRateLimit(ip)) {
      return NextResponse.json(
        { 
          error: 'RATE_LIMITED: Terlalu banyak permintaan ke AI Assistant. Silakan tunggu 1 menit atau buat tiket langsung di Pusat Bantuan.',
          escalationSuggested: true,
          suggestedCategory: 'GENERAL'
        }, 
        { status: 429 }
      );
    }

    const { message, sessionId, conversationHistory } = await req.json();

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Pesan pertanyaan wajib diisi.' }, { status: 400 });
    }

    // 2. Call AI Support Service
    const result = await AISupportService.answerQuery({
      message: message.trim(),
      sessionId,
      ip,
      conversationHistory,
    });

    // 3. Optional session persistence
    try {
      const db = getDatabase();
      const ipHash = crypto.createHash('sha256').update(ip).digest('hex').slice(0, 16);
      let activeSessionId = sessionId;

      if (!activeSessionId) {
        activeSessionId = uuidv4();
        db.prepare(`
          INSERT INTO ai_support_sessions (id, ip_hash, session_token, message_count, created_at, updated_at)
          VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))
        `).run(activeSessionId, ipHash, uuidv4());
      } else {
        db.prepare(`
          UPDATE ai_support_sessions 
          SET message_count = message_count + 1, updated_at = datetime('now')
          WHERE id = ?
        `).run(activeSessionId);
      }

      // Log messages for quality and safety audit
      const msgIdUser = uuidv4();
      db.prepare(`
        INSERT INTO ai_support_messages (id, session_id, role, content, created_at)
        VALUES (?, ?, 'user', ?, datetime('now'))
      `).run(msgIdUser, activeSessionId, message.trim());

      const msgIdAi = uuidv4();
      db.prepare(`
        INSERT INTO ai_support_messages (id, session_id, role, content, escalation_suggested, suggested_category, created_at)
        VALUES (?, ?, 'assistant', ?, ?, ?, datetime('now'))
      `).run(
        msgIdAi, 
        activeSessionId, 
        result.answer, 
        result.escalationSuggested ? 1 : 0, 
        result.suggestedCategory || null
      );
    } catch {
      // Non-fatal if session logging fails
    }

    return NextResponse.json({
      success: true,
      answer: result.answer,
      escalationSuggested: result.escalationSuggested,
      suggestedCategory: result.suggestedCategory,
      isFallback: result.isFallback,
    });
  } catch (err: any) {
    return NextResponse.json(
      { 
        error: err.message || 'Gagal memproses pesan AI',
        escalationSuggested: true,
        suggestedCategory: 'GENERAL'
      }, 
      { status: 500 }
    );
  }
}
