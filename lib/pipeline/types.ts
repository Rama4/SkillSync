// Pipeline framework types.
// Every step implements PipelineStep. UI/CLI/agents consume the same shape.

export type Scope = {kind: 'all'} | {kind: 'topic'; topicId: string};

export interface PlanItem {
  id: string;
  label: string;
  action: string;
  reason: string;
  inputs?: string[];
  outputs?: string[];
  meta?: Record<string, unknown>;
}

export interface ItemResult {
  id: string;
  label: string;
  status: 'ok' | 'fail' | 'skip';
  outputs?: string[];
  error?: string;
  detail?: string;
  durationMs?: number;
}

export interface PlanEstimate {
  count: number;
  tokens?: number;
  seconds?: number;
  note?: string;
}

export interface PlanResult {
  items: PlanItem[];
  skipped: PlanItem[];
  estimate?: PlanEstimate;
}

export interface RunResult {
  done: ItemResult[];
  failed: ItemResult[];
  skipped?: ItemResult[];
}

export type ProgressEvent =
  | {type: 'start'; total: number}
  | {type: 'item-start'; item: PlanItem}
  | {type: 'item-end'; result: ItemResult}
  | {type: 'log'; level: 'info' | 'warn' | 'error'; message: string}
  | {type: 'done'; done: ItemResult[]; failed: ItemResult[]};

export interface RunOptions {
  itemIds?: string[];
  onProgress?: (event: ProgressEvent) => void;
}

export type StepCategory = 'process' | 'maintenance' | 'backup' | 'capture';

export interface PipelineStep {
  id: string;
  name: string;
  description: string;
  category: StepCategory;
  plan(scope: Scope): Promise<PlanResult>;
  run(scope: Scope, opts?: RunOptions): Promise<RunResult>;
}

export interface StepMetadata {
  id: string;
  name: string;
  description: string;
  category: StepCategory;
}
