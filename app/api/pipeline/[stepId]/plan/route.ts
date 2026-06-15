import {NextRequest, NextResponse} from 'next/server';
import {getStep} from '@/lib/pipeline/registry';
import '@/lib/pipeline/steps';
import type {Scope} from '@/lib/pipeline/types';

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

export async function POST(request: NextRequest, {params}: RouteParams) {
  try {
    const {stepId} = await params;
    const step = getStep(stepId);
    if (!step) {
      return NextResponse.json({error: `Unknown step '${stepId}'`}, {status: 404});
    }
    const body = await request.json().catch(() => ({}));
    const scope = parseScope(body?.scope);
    const result = await step.plan(scope);
    return NextResponse.json({step: stepId, scope, ...result});
  } catch (err) {
    console.error('[api.pipeline.plan] error:', err);
    return NextResponse.json(
      {error: err instanceof Error ? err.message : 'Unknown error'},
      {status: 500},
    );
  }
}
