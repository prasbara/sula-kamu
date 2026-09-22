import { NextRequest } from 'next/server';
import { StrangerCamService, SignalBus } from '@/src/services/stranger/strangerCamService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const sessionId = url.searchParams.get('sessionId');
  const receiverId = url.searchParams.get('receiverId');

  if (!sessionId || !receiverId) {
    return new Response(JSON.stringify({ error: 'INVALID_QUERY', message: 'sessionId and receiverId required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let cleanupSubscription: (() => void) | null = null;
  let heartbeatTimer: NodeJS.Timeout | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Send initial connect frame
      controller.enqueue(encoder.encode(': connected\n\n'));

      // Replay any pending signals stored within last 15s
      try {
        const pending = StrangerCamService.getSignals(sessionId, receiverId);
        if (pending && pending.length > 0) {
          for (const s of pending) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(s)}\n\n`));
          }
        }
      } catch {}

      // Subscribe to instant in-process signal bus
      cleanupSubscription = SignalBus.subscribe(sessionId, receiverId, (signal) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(signal)}\n\n`));
        } catch {
          // Stream closed
        }
      });

      // Keepalive ping every 10 seconds
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(': ping\n\n'));
        } catch {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
        }
      }, 10000);
    },
    cancel() {
      if (cleanupSubscription) cleanupSubscription();
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
