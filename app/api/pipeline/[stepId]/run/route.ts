import {NextRequest} from 'next/server';
import {getStep} from '@/lib/pipeline/registry';
import '@/lib/pipeline/steps';
import type {ProgressEvent, Scope} from '@/lib/pipeline/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{stepId: string}>;
}

function parseScope(raw: unknown): Scope {
  if (!raw || typeof raw !== 'object') return {kind: 'all'};
  const obj = raw as {kind?: string; topicId?: string};
  if (obj.kind === 'topic' && typeof obj.topicId === 'string' && obj.topicId.length > 0) {
    return {kind: 'topic', topicId: obj.topicId};
  }
  return {kind: 'all'};
}

function sseLine(event: ProgressEvent | {type: 'error'; message: string}): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: NextRequest, {params}: RouteParams) {
  const {stepId} = await params;
  const step = getStep(stepId);
  if (!step) {
    return new Response(
      sseLine({type: 'error', message: `Unknown step '${stepId}'`}),
      {status: 404, headers: {'Content-Type': 'text/event-stream'}},
    );
  }

  const body = await request.json().catch(() => ({}));
  const scope = parseScope(body?.scope);
  const itemIds: string[] | undefined = Array.isArray(body?.itemIds) ? body.itemIds : undefined;

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: ProgressEvent | {type: 'error'; message: string}) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(sseLine(event)));
        } catch {
          closed = true;
        }
      };

      try {
        await step.run(scope, {itemIds, onProgress: send});
      } catch (err) {
        send({type: 'error', message: err instanceof Error ? err.message : String(err)});
      } finally {
        if (!closed) {
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      }
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Disable proxy buffering (Tailscale etc).
      'X-Accel-Buffering': 'no',
    },
  });
}
