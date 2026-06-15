'use client';

import {useEffect, useMemo, useState} from 'react';
import Header from '@/components/Header';
import StepCard from '@/components/pipeline/StepCard';
import type {Scope, StepCategory, StepMetadata} from '@/lib/pipeline/types';
import {Loader2, Workflow} from 'lucide-react';

interface ApiState {
  steps: StepMetadata[];
  topics: string[];
}

const CATEGORY_ORDER: StepCategory[] = ['capture', 'process', 'maintenance', 'backup'];
const CATEGORY_LABEL: Record<StepCategory, string> = {
  capture: 'Capture',
  process: 'Process',
  maintenance: 'Maintenance',
  backup: 'Backup',
};

export default function PipelinePage() {
  const [state, setState] = useState<ApiState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scopeValue, setScopeValue] = useState<string>('all');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/pipeline', {signal: controller.signal})
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: ApiState) => setState(data))
      .catch(err => {
        if ((err as Error).name !== 'AbortError') {
          setError(err instanceof Error ? err.message : String(err));
        }
      });
    return () => controller.abort();
  }, []);

  const scope: Scope = useMemo(() => {
    if (scopeValue === 'all') return {kind: 'all'};
    return {kind: 'topic', topicId: scopeValue};
  }, [scopeValue]);

  const groups = useMemo(() => {
    if (!state) return [] as Array<{category: StepCategory; steps: StepMetadata[]}>;
    const byCat = new Map<StepCategory, StepMetadata[]>();
    for (const s of state.steps) {
      const arr = byCat.get(s.category) ?? [];
      arr.push(s);
      byCat.set(s.category, arr);
    }
    return CATEGORY_ORDER.filter(c => byCat.has(c)).map(c => ({
      category: c,
      steps: (byCat.get(c) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [state]);

  return (
    <main className="min-h-screen pb-12">
      <Header />

      <section className="pt-16 pb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 mb-1">
            <Workflow className="w-5 h-5 text-primary-400" />
            <h1 className="text-2xl font-bold font-display text-white">Pipeline</h1>
          </div>
          <p className="text-gray-400 text-sm leading-snug mb-4">
            Discrete, idempotent steps you run on demand. Each step can be planned (dry run) before
            execution, and only does work that hasn{"'"}t already been done.
          </p>

          {/* Scope picker */}
          <div className="card p-3 flex items-center gap-3 flex-wrap">
            <label className="text-xs text-gray-400 font-medium">Scope</label>
            <select
              value={scopeValue}
              onChange={e => setScopeValue(e.target.value)}
              className="px-3 py-1.5 text-xs bg-surface-2 border border-surface-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="all">All topics</option>
              {state?.topics.map(t => (
                <option key={t} value={t}>
                  topic: {t}
                </option>
              ))}
            </select>
            <span className="text-[11px] text-gray-500">
              Steps below will operate on{' '}
              <code className="text-primary-300">
                {scope.kind === 'all' ? 'all' : `topic:${scope.topicId}`}
              </code>
            </span>
          </div>
        </div>
      </section>

      <section className="px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          {error && (
            <div className="card p-3 border-red-500/30 text-red-300 text-sm">{error}</div>
          )}

          {!state && !error && (
            <div className="flex items-center gap-2 text-gray-400 text-sm py-8 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading pipeline...
            </div>
          )}

          {groups.map(group => (
            <div key={group.category} className="space-y-2">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1">
                {CATEGORY_LABEL[group.category]}
              </h2>
              <div className="space-y-3">
                {group.steps.map(step => (
                  <StepCard key={step.id} step={step} scope={scope} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
