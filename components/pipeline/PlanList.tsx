'use client';

import type {PlanItem} from '@/lib/pipeline/types';
import {useState} from 'react';
import {ChevronDown, ChevronRight} from 'lucide-react';

interface PlanListProps {
  items: PlanItem[];
  skipped: PlanItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
}

function severityClass(item: PlanItem): string {
  const sev = item.meta?.severity;
  if (sev === 'error') return 'text-red-400';
  if (sev === 'warning') return 'text-amber-400';
  if (sev === 'info') return 'text-sky-400';
  return 'text-gray-300';
}

export default function PlanList({items, skipped, selectedIds, onToggle, onToggleAll}: PlanListProps) {
  const [showSkipped, setShowSkipped] = useState(false);
  const allChecked = items.length > 0 && items.every(i => selectedIds.has(i.id));

  return (
    <div className="space-y-2">
      {items.length === 0 ? (
        <div className="text-xs text-gray-500 py-2 px-3 bg-surface-0 rounded-lg border border-surface-3">
          Nothing to do for this scope.
        </div>
      ) : (
        <div className="border border-surface-3 rounded-lg bg-surface-0 overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 bg-surface-2 border-b border-surface-3">
            <input
              type="checkbox"
              checked={allChecked}
              onChange={onToggleAll}
              className="accent-primary-500"
            />
            <span className="text-xs text-gray-400 font-medium">
              {items.length} item{items.length === 1 ? '' : 's'} ({selectedIds.size} selected)
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-surface-3">
            {items.map(item => (
              <label
                key={item.id}
                className="flex items-start gap-2 px-3 py-2 hover:bg-surface-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => onToggle(item.id)}
                  className="mt-0.5 accent-primary-500"
                />
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-mono truncate ${severityClass(item)}`}>{item.label}</div>
                  <div className="text-[11px] text-gray-500 mt-0.5">
                    {item.action} <span className="text-gray-600">&middot; {item.reason}</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {skipped.length > 0 && (
        <div className="border border-surface-3 rounded-lg bg-surface-0">
          <button
            onClick={() => setShowSkipped(!showSkipped)}
            className="w-full flex items-center gap-1.5 px-3 py-2 text-xs text-gray-500 hover:text-gray-300">
            {showSkipped ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            Skipped: {skipped.length} (already done)
          </button>
          {showSkipped && (
            <div className="max-h-48 overflow-y-auto divide-y divide-surface-3 border-t border-surface-3">
              {skipped.map(item => (
                <div key={item.id} className="px-3 py-1.5 text-[11px] text-gray-500">
                  <div className="font-mono truncate">{item.label}</div>
                  <div className="text-gray-600">{item.reason}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
