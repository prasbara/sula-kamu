/**
 * POST /api/safe-chat/end
 *
 * Immediately ends a safe chat session.
 * Safety actions (Block, Report) always override the 10-minute requirement.
 *
 * Expected body: { matchId: string, userId: string, reason: 'USER_ENDED' | 'BLOCKED' | 'REPORTED' }
 *
 * Always releases exclusive locks for both participants.
 * For BLOCKED: also writes to blocks table.
 * For REPORTED: caller should separately call the report API.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SafeChatService } from '../../../../src/services/chat/safeChatService';
import { getDatabase } from '../../../../src/database/db';
import { v4 as uuidv4 } from 'uuid';

type EndReason = 'USER_ENDED' | 'BLOCKED' | 'REPORTED';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { matchId, userId, reason } = body as {
      matchId?: string;
      userId?: string;
      reason?: EndReason;
    };

    if (!matchId || !userId || !reason) {
      return NextResponse.json(
        { error: 'MISSING_PARAMS', message: 'matchId, userId, and reason are required.' },
        { status: 400 }
      );
    }

    if (!['USER_ENDED', 'BLOCKED', 'REPORTED'].includes(reason)) {
      return NextResponse.json(
        { error: 'INVALID_REASON', message: 'Invalid end reason.' },
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

    // End the session and release locks
    const result = SafeChatService.endSession(matchId, userId, reason);

    // If BLOCKED: write block record and deactivate match
    if (reason === 'BLOCKED') {
      const blockedId = match.user_a_id === userId ? match.user_b_id : match.user_a_id;

      // Insert block (ignore if already exists)
      try {
        db.prepare(`
          INSERT INTO blocks (id, blocker_id, blocked_id) VALUES (?, ?, ?)
        `).run(uuidv4(), userId, blockedId);
      } catch {
        // Already blocked — ignore
      }

      db.prepare(`
        UPDATE matches
        SET is_active = 0, unmatched_by = ?, unmatched_reason = 'BLOCKED', updated_at = datetime('now')
        WHERE id = ?
      `).run(userId, matchId);
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err: any) {
    console.error('[POST /api/safe-chat/end]', err);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
