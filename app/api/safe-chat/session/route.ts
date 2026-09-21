/**
 * GET /api/safe-chat/session?matchId=...&userId=...
 *
 * Returns the current session status for a match.
 * Used by the frontend to render the safe chat UI.
 *
 * Authentication: bearer token (bridge token) or admin session.
 * The userId query param is validated against the match participants.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SafeChatService } from '../../../../src/services/chat/safeChatService';
import { getDatabase } from '../../../../src/database/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get('matchId');
    const userId = searchParams.get('userId');

    if (!matchId || !userId) {
      return NextResponse.json(
        { error: 'MISSING_PARAMS', message: 'matchId and userId are required.' },
        { status: 400 }
      );
    }

    const db = getDatabase();

    // Validate user is part of this match
    const match = db.prepare(
      'SELECT user_a_id, user_b_id FROM matches WHERE id = ? AND is_active = 1'
    ).get(matchId) as { user_a_id: string; user_b_id: string } | undefined;

    if (!match) {
      return NextResponse.json(
        { error: 'MATCH_NOT_FOUND', message: 'Match not found or not active.' },
        { status: 404 }
      );
    }

    if (match.user_a_id !== userId && match.user_b_id !== userId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'You are not a participant of this match.' },
        { status: 403 }
      );
    }

    const status = SafeChatService.getSessionStatus(matchId);

    return NextResponse.json({ ok: true, session: status });
  } catch (err: any) {
    console.error('[GET /api/safe-chat/session]', err);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
