'use client';

import type {ItemResult, PlanItem, PlanResult, ProgressEvent, Scope, StepMetadata} from '@/lib/pipeline/types';
import {useCallback, useState} from 'react';
import {Loader2, Play, Search, AlertTriangle, CheckCircle2, XCircle} from 'lucide-react';
import PlanList from './PlanList';

interface StepCardProps {
  step: StepMetadata;
  scope: Scope;
}

type Phase = 'idle' | 'planning' | 'planned' | 'running' | 'done';

interface LogLine {
  level: 'info' | 'warn' | 'error' | 'progress';
  message: string;
  timestamp: number;
}

export default function StepCard({step, scope}: StepCardProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [plan, setPlan] = useState<PlanResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [results, setResults] = useState<{done: ItemResult[]; failed: ItemResult[]} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressCount, setProgressCount] = useState<{done: number; total: number}>({done: 0, total: 0});

  const appendLog = useCallback((line: Omit<LogLine, 'timestamp'>) => {
    setLogs(prev => [...prev, {...line, timestamp: Date.now()}]);
  }, []);

  const handlePlan = useCallback(async () => {
    setPhase('planning');
    setError(null);
    setResults(null);
    setLogs([]);
    try {
      const res = await fetch(`/api/pipeline/${step.id}/plan`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({scope}),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as PlanResult & {step: string};
      setPlan(data);
      setSelectedIds(new Set(data.items.map(i => i.id)));
      setPhase('planned');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setPhase('idle');
    }
  }, [step.id, scope]);

  const toggle = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    setSelectedIds(prev => {
      if (!plan) return prev;
      const all = plan.items.map(i => i.id);
      const allSelected = all.every(id => prev.has(id));
      return allSelected ? new Set() : new Set(all);
    });
  }, [plan]);

  const handleRun = useCallback(
    async (runAll: boolean) => {
      if (phase === 'running') return;
      setError(null);
      setResults(null);
      setLogs([]);
      setPhase('running');
      setProgressCount({done: 0, total: 0});

      const itemIds = runAll ? undefined : Array.from(selectedIds);

      try {
        const res = await fetch(`/api/pipeline/${step.id}/run`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({scope, itemIds}),
        });
        if (!res.body) throw new Error('No response body');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let doneCount = 0;
        let total = 0;
        let final: {done: ItemResult[]; failed: ItemResult[]} | null = null;

        while (true) {
          const {done, value} = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, {stream: true});
          let idx: number;
          while ((idx = buffer.indexOf('\n\n')) !== -1) {
            const chunk = buffer.slice(0, idx);
            buffer = buffer.slice(idx + 2);
            const dataLine = chunk.split('\n').find(l => l.startsWith('data:'));
            if (!dataLine) continue;
            const json = dataLine.slice(5).trim();
            if (!json) continue;
            let event: ProgressEvent | {type: 'error'; message: string};
            try {
              event = JSON.parse(json);
            } catch {
              continue;
            }
            switch (event.type) {
              case 'start':
                total = event.total;
                setProgressCount({done: 0, total});
                appendLog({level: 'info', message: `Starting (${total} item${total === 1 ? '' : 's'})`});
                break;
              case 'item-start':
                appendLog({level: 'progress', message: `> ${(event as {item: PlanItem}).item.label}`});
                break;
              case 'item-end': {
                const r = (event as {result: ItemResult}).result;
                doneCount += 1;
                setProgressCount({done: doneCount, total});
                if (r.status === 'ok') {
                  appendLog({
                    level: 'info',
                    message: `  ok: ${r.detail ?? (r.outputs ?? []).join(', ')} (${r.durationMs ?? 0}ms)`,
                  });
                } else if (r.status === 'fail') {
                  appendLog({level: 'error', message: `  fail: ${r.error}`});
                } else {
                  appendLog({level: 'warn', message: `  skipped`});
                }
                break;
              }
              case 'log':
                appendLog({level: event.level, message: event.message});
                break;
              case 'done':
                final = {done: event.done, failed: event.failed};
                appendLog({
                  level: event.failed.length > 0 ? 'warn' : 'info',
                  message: `Finished: ${event.done.length} ok, ${event.failed.length} failed`,
                });
                break;
              case 'error':
                appendLog({level: 'error', message: event.message});
                setError(event.message);
                break;
            }
          }
        }

        setResults(final);
        setPhase('done');
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
        appendLog({level: 'error', message: err instanceof Error ? err.message : String(err)});
        setPhase('done');
      }
    },
    [phase, scope, selectedIds, step.id, appendLog],
  );

  const canRun = phase === 'planned' && (plan?.items.length ?? 0) > 0;

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <code className="text-xs text-primary-300 font-mono">{step.id}</code>
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-3 text-gray-400">
              {step.category}
            </span>
          </div>
          <h3 className="text-sm font-semibold text-white mt-1">{step.name}</h3>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">{step.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handlePlan}
            disabled={phase === 'planning' || phase === 'running'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-xs text-white transition-colors disabled:opacity-50">
            {phase === 'planning' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Search className="w-3.5 h-3.5" />
            )}
            Plan
          </button>
          <button
            onClick={() => handleRun(false)}
            disabled={!canRun || selectedIds.size === 0 || phase === 'running'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-xs text-white font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {phase === 'running' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Run selected
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {plan && (
        <div className="space-y-2">
          {plan.estimate?.note && (
            <div className="text-[11px] text-gray-500">{plan.estimate.note}</div>
          )}
          <PlanList
            items={plan.items}
            skipped={plan.skipped}
            selectedIds={selectedIds}
            onToggle={toggle}
            onToggleAll={toggleAll}
          />
        </div>
      )}

      {(phase === 'running' || phase === 'done') && logs.length > 0 && (
        <div className="border border-surface-3 rounded-lg bg-surface-0 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-surface-2 border-b border-surface-3">
            <span className="text-[11px] text-gray-400 font-medium">Output</span>
            <span className="text-[11px] text-gray-500">
              {progressCount.total > 0 && `${progressCount.done}/${progressCount.total}`}
            </span>
          </div>
          <pre className="max-h-72 overflow-y-auto p-2 text-[11px] font-mono leading-snug whitespace-pre-wrap">
            {logs.map((line, i) => (
              <div
                key={i}
                className={
                  line.level === 'error'
                    ? 'text-red-400'
                    : line.level === 'warn'
                    ? 'text-amber-400'
                    : line.level === 'progress'
                    ? 'text-primary-300'
                    : 'text-gray-300'
                }>
                {line.message}
              </div>
            ))}
          </pre>
        </div>
      )}

      {phase === 'done' && results && (
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {results.done.length} done
          </div>
          {results.failed.length > 0 && (
            <div className="flex items-center gap-1.5 text-red-400">
              <XCircle className="w-3.5 h-3.5" />
              {results.failed.length} failed
            </div>
          )}
        </div>
      )}
    </div>
  );
}
