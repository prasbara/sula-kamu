/**
 * POST /api/safe-chat/join
 *
 * Marks a user as having entered the safe chat session UI.
 * The exclusive lock and active timer only start when BOTH participants have joined.
 *
 * Expected body: { matchId: string, userId: string }
 *
 * Response includes whether the lock was acquired (both joined).
 *
 * Security:
 *  - Validates user is a match participant
 *  - Checks for existing active lock on another session (409)
 *  - Atomic — uses ON CONFLICT for lock acquisition
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
      'SELECT user_a_id, user_b_id, is_active FROM matches WHERE id = ?'
    ).get(matchId) as { user_a_id: string; user_b_id: string; is_active: number } | undefined;

    if (!match || !match.is_active) {
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

    // Check if user is locked to a DIFFERENT match's session
    const lockStatus = SafeChatService.isUserLocked(userId);
    if (lockStatus.locked && lockStatus.matchId !== matchId) {
      return NextResponse.json(
        {
          error: 'EXCLUSIVE_CHAT_ACTIVE',
          message: `Selesaikan sesi dengan ${lockStatus.partnerName} terlebih dahulu sebelum bergabung ke sesi lain.`,
          lockedMatchId: lockStatus.matchId,
        },
        { status: 409 }
      );
    }

    const { session, lockAcquired, alreadyLocked } = SafeChatService.joinSession(matchId, userId);

    if (alreadyLocked) {
      return NextResponse.json(
        {
          error: 'USER_LOCKED_OTHER_SESSION',
          message: 'Salah satu peserta sedang dalam sesi eksklusif lain. Tidak dapat memulai sesi.',
        },
        { status: 409 }
      );
    }

    return NextResponse.json({
      ok: true,
      lockAcquired,
      message: lockAcquired
        ? 'Kedua peserta bergabung — sesi eksklusif dimulai!'
        : 'Bergabung berhasil. Menunggu peserta lain...',
      session: SafeChatService.getSessionStatus(matchId),
    });
  } catch (err: any) {
    console.error('[POST /api/safe-chat/join]', err);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
