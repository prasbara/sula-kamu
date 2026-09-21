/**
 * POST /api/safe-chat/consent
 *
 * Records a user's private-chat decision after the 10-minute session completes.
 *
 * Expected body: { matchId: string, userId: string, decision: 'YES' | 'NO' | 'END' }
 *
 * Decision logic:
 *  - Both YES → PRIVATE_CHAT_ENABLED (Telegram usernames may be shared)
 *  - Either NO or END → ENDED_BY_USER
 *  - One YES, other pending → PRIVATE_CHAT_PENDING
 *
 * This endpoint enforces mutual consent — there is no way to enable private chat
 * with a unilateral YES.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SafeChatService } from '../../../../src/services/chat/safeChatService';
import { getDatabase } from '../../../../src/database/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchId, userId, decision } = body as {
      matchId?: string;
      userId?: string;
      decision?: 'YES' | 'NO' | 'END';
    };

    if (!matchId || !userId || !decision) {
      return NextResponse.json(
        { error: 'MISSING_PARAMS', message: 'matchId, userId, and decision are required.' },
        { status: 400 }
      );
    }

    if (!['YES', 'NO', 'END'].includes(decision)) {
      return NextResponse.json(
        { error: 'INVALID_DECISION', message: "decision must be 'YES', 'NO', or 'END'." },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Validate participant
    const match = db.prepare(
      'SELECT user_a_id, user_b_id FROM matches WHERE id = ?'
    ).get(matchId) as { user_a_id: string; user_b_id: string } | undefined;

    if (!match) {
      return NextResponse.json(
        { error: 'MATCH_NOT_FOUND', message: 'Match not found.' },
        { status: 404 }
      );
    }

    if (match.user_a_id !== userId && match.user_b_id !== userId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'You are not a participant of this match.' },
        { status: 403 }
      );
    }

    // END is treated as NO for the decision
    const normalizedDecision: 'YES' | 'NO' = decision === 'YES' ? 'YES' : 'NO';

    const result = SafeChatService.recordPrivateDecision(matchId, userId, normalizedDecision);

    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error('[POST /api/safe-chat/consent]', err);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
