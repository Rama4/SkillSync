import {NextResponse} from 'next/server';
import {listSteps} from '@/lib/pipeline/registry';
// Side-effect import: registers every step in the registry.
import '@/lib/pipeline/steps';
import {listTopics} from '@/lib/pipeline/scope';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    steps: listSteps(),
    topics: listTopics().map(t => t.topicId),
  });
}
