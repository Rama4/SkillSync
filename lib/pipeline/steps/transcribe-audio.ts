import fs from 'fs';
import path from 'path';
import {DEFAULT_TRANSCRIBE_MODEL, transcribe} from '@/lib/llm';
import {registerStep} from '../registry';
import {fileInputKey, getRecord, setRecord} from '../state';
import {transcriptPathFor, walkAudioFiles, type AudioFileRef} from '../scope';
import type {ItemResult, PipelineStep, PlanItem, PlanResult, RunResult, Scope} from '../types';

const STEP_ID = 'transcribe-audio';

interface TranscriptSidecar {
  text: string;
  segments?: Array<{id: number; start: number; end: number; text: string}>;
  language?: string;
  duration?: number;
  model: string;
  audioFile: string;
  createdAt: string;
}

function itemIdFor(ref: AudioFileRef): string {
  return ref.relativePath;
}

function makePlanItem(ref: AudioFileRef, reason: string, action: string): PlanItem {
  return {
    id: itemIdFor(ref),
    label: ref.relativePath,
    action,
    reason,
    inputs: [ref.relativePath],
    outputs: [path.relative(path.resolve('.'), transcriptPathFor(ref.absolutePath))],
    meta: {
      topicId: ref.topicId,
      lessonId: ref.lessonId,
      noteId: ref.noteId,
      sizeBytes: ref.size,
    },
  };
}

function isAlreadyDone(ref: AudioFileRef): boolean {
  const sidecar = transcriptPathFor(ref.absolutePath);
  if (!fs.existsSync(sidecar)) return false;
  const record = getRecord(STEP_ID, fileInputKey(ref.absolutePath));
  // If a sidecar exists but no manifest record, treat as done anyway -- the user
  // may have transcripts from before the manifest existed. Idempotency holds.
  if (!record) return true;
  // Manifest record exists; trust it (input key matched on lookup).
  return true;
}

const step: PipelineStep = {
  id: STEP_ID,
  name: 'Transcribe audio',
  description:
    'Find note audio files without a transcript and run them through Groq Whisper. ' +
    'Writes a {noteId}.transcript.json sidecar next to the audio file.',
  category: 'process',

  async plan(scope: Scope): Promise<PlanResult> {
    const files = walkAudioFiles(scope);
    const items: PlanItem[] = [];
    const skipped: PlanItem[] = [];
    for (const ref of files) {
      const sizeKb = Math.round(ref.size / 1024);
      const action = `transcribe (${sizeKb} KB) via ${DEFAULT_TRANSCRIBE_MODEL}`;
      if (isAlreadyDone(ref)) {
        skipped.push(makePlanItem(ref, 'transcript sidecar already exists', action));
      } else {
        items.push(makePlanItem(ref, 'no transcript sidecar found', action));
      }
    }
    return {
      items,
      skipped,
      estimate: {
        count: items.length,
        note: items.length === 0 ? 'Nothing to do.' : `~1 Groq request per file.`,
      },
    };
  },

  async run(scope: Scope, opts = {}): Promise<RunResult> {
    const {items} = await this.plan(scope);
    const selected = opts.itemIds ? items.filter(i => opts.itemIds!.includes(i.id)) : items;
    const refs = walkAudioFiles(scope);
    const byId = new Map(refs.map(r => [itemIdFor(r), r] as const));

    opts.onProgress?.({type: 'start', total: selected.length});

    const done: ItemResult[] = [];
    const failed: ItemResult[] = [];

    for (const item of selected) {
      const ref = byId.get(item.id);
      if (!ref) {
        const result: ItemResult = {
          id: item.id,
          label: item.label,
          status: 'fail',
          error: 'Audio file disappeared between plan and run',
        };
        failed.push(result);
        opts.onProgress?.({type: 'item-end', result});
        continue;
      }

      opts.onProgress?.({type: 'item-start', item});
      const startedAt = Date.now();

      try {
        const stream = fs.createReadStream(ref.absolutePath);
        const transcript = await transcribe(stream, {responseFormat: 'verbose_json'});

        const sidecarPath = transcriptPathFor(ref.absolutePath);
        const sidecar: TranscriptSidecar = {
          text: transcript.text,
          segments: transcript.segments,
          language: transcript.language,
          duration: transcript.duration,
          model: transcript.model,
          audioFile: ref.fileName,
          createdAt: new Date().toISOString(),
        };
        fs.writeFileSync(sidecarPath, JSON.stringify(sidecar, null, 2));

        setRecord(STEP_ID, fileInputKey(ref.absolutePath), {
          completedAt: sidecar.createdAt,
          outputs: [path.relative(path.resolve('.'), sidecarPath)],
          meta: {
            model: transcript.model,
            language: transcript.language,
            duration: transcript.duration,
            chars: transcript.text.length,
          },
        });

        const result: ItemResult = {
          id: item.id,
          label: item.label,
          status: 'ok',
          outputs: [path.relative(path.resolve('.'), sidecarPath)],
          detail: `${transcript.text.length} chars${
            transcript.duration ? ` from ${Math.round(transcript.duration)}s audio` : ''
          }`,
          durationMs: Date.now() - startedAt,
        };
        done.push(result);
        opts.onProgress?.({type: 'item-end', result});
      } catch (err) {
        const result: ItemResult = {
          id: item.id,
          label: item.label,
          status: 'fail',
          error: err instanceof Error ? err.message : String(err),
          durationMs: Date.now() - startedAt,
        };
        failed.push(result);
        opts.onProgress?.({type: 'item-end', result});
      }
    }

    opts.onProgress?.({type: 'done', done, failed});
    return {done, failed};
  },
};

registerStep(step);
