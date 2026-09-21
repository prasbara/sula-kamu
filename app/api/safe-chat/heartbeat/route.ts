/**
 * POST /api/safe-chat/heartbeat
 *
 * Records a server-side presence heartbeat for a user in an active safe chat session.
 * This is the ONLY mechanism that advances the mutual-active timer.
 *
 * Expected body: { matchId: string, userId: string }
 *
 * Rate: client should call every 10–15 seconds.
 * Server enforces meaningful tick only when both users have heartbeated within 30 seconds.
 *
 * Returns: updated session status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SafeChatService } from '../../../../src/services/chat/safeChatService';
import { getDatabase } from '../../../../src/database/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchId, userId } = body as { matchId?: string; userId?: string };

    if (!matchId || !userId) {
      return NextResponse.json(
        { error: 'MISSING_PARAMS', message: 'matchId and userId are required.' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Validate user is part of this match
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

    // Tick the active seconds accumulator and record heartbeat
    const sessionStatus = SafeChatService.tickActiveSeconds(matchId, userId);

    return NextResponse.json({ ok: true, session: sessionStatus });
  } catch (err: any) {
    console.error('[POST /api/safe-chat/heartbeat]', err);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
