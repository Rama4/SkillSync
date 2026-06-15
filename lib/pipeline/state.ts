import fs from 'fs';
import path from 'path';
import {DATA_DIR} from '@/lib/constants';

const STATE_DIR = path.join(DATA_DIR, '_meta');
const STATE_PATH = path.join(STATE_DIR, 'state.json');

export interface StateRecord {
  completedAt: string;
  outputs?: string[];
  meta?: Record<string, unknown>;
}

interface Manifest {
  version: 1;
  steps: Record<string, Record<string, StateRecord>>;
}

function emptyManifest(): Manifest {
  return {version: 1, steps: {}};
}

function readManifest(): Manifest {
  try {
    if (!fs.existsSync(STATE_PATH)) return emptyManifest();
    const parsed = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8')) as Manifest;
    if (parsed.version !== 1 || !parsed.steps) return emptyManifest();
    return parsed;
  } catch (err) {
    console.warn('[pipeline.state] manifest unreadable, starting fresh:', err);
    return emptyManifest();
  }
}

function writeManifest(manifest: Manifest): void {
  if (!fs.existsSync(STATE_DIR)) fs.mkdirSync(STATE_DIR, {recursive: true});
  const tmp = `${STATE_PATH}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2));
  fs.renameSync(tmp, STATE_PATH);
}

export function getRecord(stepId: string, inputKey: string): StateRecord | undefined {
  return readManifest().steps[stepId]?.[inputKey];
}

export function setRecord(stepId: string, inputKey: string, record: StateRecord): void {
  const m = readManifest();
  if (!m.steps[stepId]) m.steps[stepId] = {};
  m.steps[stepId][inputKey] = record;
  writeManifest(m);
}

export function setRecords(
  updates: Array<{stepId: string; inputKey: string; record: StateRecord}>,
): void {
  if (updates.length === 0) return;
  const m = readManifest();
  for (const u of updates) {
    if (!m.steps[u.stepId]) m.steps[u.stepId] = {};
    m.steps[u.stepId][u.inputKey] = u.record;
  }
  writeManifest(m);
}

export function deleteRecord(stepId: string, inputKey: string): void {
  const m = readManifest();
  if (m.steps[stepId]) {
    delete m.steps[stepId][inputKey];
    writeManifest(m);
  }
}

/**
 * Build a cheap idempotency key for a file: path|size|mtime (truncated to ms).
 * Re-runs will see a different key if the file is modified or replaced.
 */
export function fileInputKey(filePath: string): string {
  const stat = fs.statSync(filePath);
  return `${filePath}|${stat.size}|${Math.floor(stat.mtimeMs)}`;
}
