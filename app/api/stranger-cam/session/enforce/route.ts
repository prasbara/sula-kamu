import { NextRequest, NextResponse } from 'next/server';
import { StrangerCamService, ModerationEnforcementInput } from '@/src/services/stranger/strangerCamService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      userId,
      sessionId,
      violationType,
      severity,
      detectionConfidence,
      detectionDurationMs,
      detectionMetadata,
      automatedAction,
      reason,
    } = body;

    if (!userId || !sessionId || !violationType) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'userId, sessionId, and violationType are required.' },
        { status: 400 }
      );
    }

    const input: ModerationEnforcementInput = {
      userId,
      sessionId,
      violationType,
      severity: severity || 'HIGH',
      detectionConfidence: typeof detectionConfidence === 'number' ? detectionConfidence : 0.9,
      detectionDurationMs: typeof detectionDurationMs === 'number' ? detectionDurationMs : 0,
      detectionMetadata: detectionMetadata || {},
      automatedAction: automatedAction || 'RESTRICT_USER',
      reason: reason || `Automated safety enforcement: ${violationType}`,
    };

    const result = StrangerCamService.enforceModerationViolation(input);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Stranger Cam enforcement error:', err);
    return NextResponse.json(
      { error: 'ENFORCEMENT_FAILED', message: err.message || 'Gagal menegakkan moderasi Stranger Cam.' },
      { status: 500 }
    );
  }
}
