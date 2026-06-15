#!/usr/bin/env node
/**
 * Pipeline CLI.
 *
 *   pnpm pipeline list
 *   pnpm pipeline plan <stepId> [--scope all|topic:<id>]
 *   pnpm pipeline run  <stepId> [--scope ...] [--items id1,id2] [--dry-run]
 *
 * Consumes the same step registry that the web UI uses.
 */
import fs from 'fs';
import path from 'path';

// Load .env.local (and .env) before importing modules that read process.env.
function loadEnv(filePath: string): void {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, 'utf-8');
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const m = /^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1];
    if (process.env[key] !== undefined) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}
loadEnv(path.join(process.cwd(), '.env.local'));
loadEnv(path.join(process.cwd(), '.env'));

import {getStep, listSteps} from '../lib/pipeline/registry';
import {parseScope, formatScope} from '../lib/pipeline/scope';
import '../lib/pipeline/steps';
import type {ItemResult, PlanItem, ProgressEvent, Scope} from '../lib/pipeline/types';

// ---------- arg parsing ----------

type Flags = Record<string, string | boolean>;

function parseArgs(argv: string[]): {cmd: string | undefined; positionals: string[]; flags: Flags} {
  const out: {cmd: string | undefined; positionals: string[]; flags: Flags} = {
    cmd: argv[0],
    positionals: [],
    flags: {},
  };
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=');
      if (eq !== -1) {
        out.flags[arg.slice(2, eq)] = arg.slice(eq + 1);
      } else {
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith('--')) {
          out.flags[arg.slice(2)] = next;
          i++;
        } else {
          out.flags[arg.slice(2)] = true;
        }
      }
    } else {
      out.positionals.push(arg);
    }
  }
  return out;
}

// ---------- pretty output ----------

const COLOR = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function color(c: keyof typeof COLOR, s: string): string {
  return `${COLOR[c]}${s}${COLOR.reset}`;
}

function printPlanItems(label: string, items: PlanItem[]): void {
  if (items.length === 0) return;
  console.log(`\n${color('bold', label)} (${items.length})`);
  for (const item of items) {
    const sev = item.meta?.severity;
    const sevColor: keyof typeof COLOR =
      sev === 'error' ? 'red' : sev === 'warning' ? 'yellow' : sev === 'info' ? 'cyan' : 'gray';
    console.log(`  ${color(sevColor, '\u2022')} ${item.label}`);
    console.log(`      ${color('dim', `${item.action} -- ${item.reason}`)}`);
  }
}

function printResult(r: ItemResult): void {
  if (r.status === 'ok') {
    const detail = r.detail ?? (r.outputs ?? []).join(', ');
    console.log(
      `  ${color('green', 'OK  ')} ${r.label} ${color('dim', `(${r.durationMs ?? 0}ms) ${detail}`)}`,
    );
  } else if (r.status === 'fail') {
    console.log(`  ${color('red', 'FAIL')} ${r.label} ${color('red', `-- ${r.error}`)}`);
  } else {
    console.log(`  ${color('yellow', 'SKIP')} ${r.label}`);
  }
}

// ---------- commands ----------

function getScopeFlag(flags: Flags): Scope {
  const raw = typeof flags.scope === 'string' ? flags.scope : undefined;
  return parseScope(raw);
}

async function cmdList(): Promise<number> {
  const steps = listSteps();
  if (steps.length === 0) {
    console.log('No steps registered.');
    return 0;
  }
  console.log(color('bold', 'Available pipeline steps:'));
  for (const s of steps) {
    console.log(`  ${color('cyan', s.id.padEnd(20))} ${color('dim', `[${s.category}]`)} ${s.name}`);
    console.log(`      ${color('gray', s.description)}`);
  }
  return 0;
}

async function cmdPlan(stepId: string | undefined, flags: Flags): Promise<number> {
  if (!stepId) {
    console.error('usage: pipeline plan <stepId> [--scope all|topic:<id>]');
    return 1;
  }
  const step = getStep(stepId);
  if (!step) {
    console.error(`Unknown step '${stepId}'. Run 'pipeline list' to see options.`);
    return 1;
  }
  const scope = getScopeFlag(flags);
  console.log(color('dim', `step=${step.id} scope=${formatScope(scope)}`));
  const result = await step.plan(scope);
  printPlanItems('Items to do', result.items);
  printPlanItems('Skipped', result.skipped);
  if (result.estimate?.note) {
    console.log(`\n${color('dim', result.estimate.note)}`);
  }
  return 0;
}

async function cmdRun(stepId: string | undefined, flags: Flags): Promise<number> {
  if (!stepId) {
    console.error('usage: pipeline run <stepId> [--scope all|topic:<id>] [--items a,b] [--dry-run]');
    return 1;
  }
  if (flags['dry-run']) return cmdPlan(stepId, flags);
  const step = getStep(stepId);
  if (!step) {
    console.error(`Unknown step '${stepId}'.`);
    return 1;
  }
  const scope = getScopeFlag(flags);
  const itemIds =
    typeof flags.items === 'string' ? flags.items.split(',').map(s => s.trim()).filter(Boolean) : undefined;

  console.log(color('dim', `step=${step.id} scope=${formatScope(scope)}`));

  const onProgress = (event: ProgressEvent): void => {
    switch (event.type) {
      case 'start':
        console.log(color('dim', `Running ${event.total} item(s)...`));
        break;
      case 'item-start':
        process.stdout.write(color('dim', `  > ${event.item.label}\n`));
        break;
      case 'item-end':
        printResult(event.result);
        break;
      case 'log':
        console.log(color(event.level === 'error' ? 'red' : 'gray', `  ${event.message}`));
        break;
      case 'done':
        console.log(
          `\n${color('bold', 'Done:')} ${color('green', `${event.done.length} ok`)}, ${
            event.failed.length > 0
              ? color('red', `${event.failed.length} failed`)
              : color('dim', '0 failed')
          }`,
        );
        break;
    }
  };

  const {failed} = await step.run(scope, {itemIds, onProgress});
  return failed.length > 0 ? 2 : 0;
}

function printHelp(): void {
  console.log(`SkillSync pipeline CLI

Usage:
  pnpm pipeline list
  pnpm pipeline plan <stepId> [--scope all|topic:<id>]
  pnpm pipeline run  <stepId> [--scope ...] [--items id1,id2] [--dry-run]

Examples:
  pnpm pipeline list
  pnpm pipeline plan transcribe-audio
  pnpm pipeline run  transcribe-audio --scope topic:deep-learning
  pnpm pipeline run  health-check
`);
}

async function main(): Promise<number> {
  const {cmd, positionals, flags} = parseArgs(process.argv.slice(2));
  if (!cmd || flags.help) {
    printHelp();
    return 0;
  }
  switch (cmd) {
    case 'list':
      return cmdList();
    case 'plan':
      return cmdPlan(positionals[0], flags);
    case 'run':
      return cmdRun(positionals[0], flags);
    default:
      console.error(`Unknown command '${cmd}'.\n`);
      printHelp();
      return 1;
  }
}

main().then(
  code => process.exit(code),
  err => {
    console.error(color('red', err instanceof Error ? err.message : String(err)));
    if (err instanceof Error && err.stack) console.error(color('dim', err.stack));
    process.exit(1);
  },
);
