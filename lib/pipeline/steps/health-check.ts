import fs from 'fs';
import path from 'path';
import {DATA_DIR} from '@/lib/constants';
import {registerStep} from '../registry';
import {listTopics, transcriptPathFor, walkAudioFiles, walkNotes} from '../scope';
import type {ItemResult, PipelineStep, PlanItem, PlanResult, RunResult, Scope} from '../types';

const STEP_ID = 'health-check';

// Groq Whisper hard cap on free tier (25 MB raw upload).
const AUDIO_MAX_BYTES = 25 * 1024 * 1024;

type Severity = 'info' | 'warning' | 'error';

interface Issue {
  id: string;
  label: string;
  action: string;
  reason: string;
  severity: Severity;
  meta?: Record<string, unknown>;
}

function asPlanItem(issue: Issue): PlanItem {
  return {
    id: issue.id,
    label: issue.label,
    action: issue.action,
    reason: issue.reason,
    meta: {severity: issue.severity, ...(issue.meta ?? {})},
  };
}

function collectIssues(scope: Scope): Issue[] {
  const issues: Issue[] = [];

  // 1. Audio files without a sibling transcript (informational).
  // 2. Oversized audio files (> 25 MB) -- will fail Groq Whisper.
  const audioFiles = walkAudioFiles(scope);
  for (const ref of audioFiles) {
    const sidecar = transcriptPathFor(ref.absolutePath);
    if (!fs.existsSync(sidecar)) {
      issues.push({
        id: `no-transcript:${ref.relativePath}`,
        label: ref.relativePath,
        action: 'Run transcribe-audio',
        reason: 'audio file has no transcript sidecar',
        severity: 'info',
        meta: {topicId: ref.topicId, lessonId: ref.lessonId, noteId: ref.noteId},
      });
    }
    if (ref.size > AUDIO_MAX_BYTES) {
      issues.push({
        id: `oversized:${ref.relativePath}`,
        label: ref.relativePath,
        action: 'Split or recompress before transcribing',
        reason: `audio file is ${(ref.size / 1024 / 1024).toFixed(1)} MB (Groq Whisper limit is 25 MB)`,
        severity: 'warning',
        meta: {bytes: ref.size},
      });
    }
  }

  // 3. Notes whose audioFile field points to a missing file.
  // 4. Audio files with no matching note JSON (orphans).
  const notes = walkNotes(scope);
  const knownNoteIds = new Set(notes.map(n => `${n.topicId}/${n.lessonId}/${n.noteId}`));

  for (const note of notes) {
    try {
      const raw = JSON.parse(fs.readFileSync(note.notePath, 'utf-8'));
      const audioFile: unknown = raw?.audioFile;
      if (typeof audioFile === 'string' && audioFile.length > 0) {
        const audioAbs = path.join(path.dirname(note.notePath), audioFile);
        if (!fs.existsSync(audioAbs)) {
          issues.push({
            id: `missing-audio:${note.topicId}/${note.lessonId}/${note.noteId}`,
            label: `${note.topicId}/${note.lessonId}/notes/${note.noteId}.json`,
            action: 'Clear audioFile field or restore the audio file',
            reason: `note.audioFile points to '${audioFile}' which does not exist`,
            severity: 'error',
            meta: {expectedPath: path.relative(DATA_DIR, audioAbs)},
          });
        }
      }
    } catch (err) {
      issues.push({
        id: `unparseable:${note.topicId}/${note.lessonId}/${note.noteId}`,
        label: `${note.topicId}/${note.lessonId}/notes/${note.noteId}.json`,
        action: 'Fix invalid JSON',
        reason: `note JSON failed to parse: ${err instanceof Error ? err.message : String(err)}`,
        severity: 'error',
      });
    }
  }

  for (const audio of audioFiles) {
    const key = `${audio.topicId}/${audio.lessonId}/${audio.noteId}`;
    if (!knownNoteIds.has(key)) {
      issues.push({
        id: `orphan-audio:${audio.relativePath}`,
        label: audio.relativePath,
        action: 'Delete or attach to a note',
        reason: 'audio file has no matching note JSON',
        severity: 'warning',
      });
    }
  }

  // 5. Topic-level: each topic.json's lesson list vs files on disk.
  const topicScope = scope.kind === 'topic' ? [scope.topicId] : listTopics().map(t => t.topicId);
  for (const topicId of topicScope) {
    const topicJson = path.join(DATA_DIR, topicId, 'topic.json');
    if (!fs.existsSync(topicJson)) continue;
    try {
      const raw = JSON.parse(fs.readFileSync(topicJson, 'utf-8'));
      const declared: string[] = Array.isArray(raw?.lessons)
        ? raw.lessons.map((l: {id: string}) => l.id).filter(Boolean)
        : [];
      const lessonsDir = path.join(DATA_DIR, topicId, 'lessons');
      const onDisk = fs.existsSync(lessonsDir)
        ? fs
            .readdirSync(lessonsDir, {withFileTypes: true})
            .filter(e => e.isFile() && e.name.endsWith('.json'))
            .map(e => path.basename(e.name, '.json'))
        : [];
      const declaredSet = new Set(declared);
      const onDiskSet = new Set(onDisk);
      for (const id of declared) {
        if (!onDiskSet.has(id)) {
          issues.push({
            id: `missing-lesson-file:${topicId}/${id}`,
            label: `${topicId}/lessons/${id}.json`,
            action: 'Restore lesson file or remove from topic.json',
            reason: `topic.json declares lesson '${id}' but file is missing`,
            severity: 'error',
          });
        }
      }
      for (const id of onDisk) {
        if (!declaredSet.has(id)) {
          issues.push({
            id: `undeclared-lesson:${topicId}/${id}`,
            label: `${topicId}/lessons/${id}.json`,
            action: 'Add to topic.json or remove file',
            reason: `lesson file exists but topic.json does not reference it`,
            severity: 'warning',
          });
        }
      }
    } catch {
      issues.push({
        id: `unparseable-topic:${topicId}`,
        label: `${topicId}/topic.json`,
        action: 'Fix invalid JSON',
        reason: 'topic.json failed to parse',
        severity: 'error',
      });
    }
  }

  return issues;
}

function summarize(issues: Issue[]): {info: number; warning: number; error: number} {
  const acc = {info: 0, warning: 0, error: 0};
  for (const i of issues) acc[i.severity]++;
  return acc;
}

const step: PipelineStep = {
  id: STEP_ID,
  name: 'Health check',
  description:
    'Read-only audit of your vault: orphan audio, missing transcripts, broken note refs, ' +
    'oversized files, and topic.json drift. Safe to run anytime.',
  category: 'maintenance',

  async plan(scope: Scope): Promise<PlanResult> {
    const issues = collectIssues(scope);
    const summary = summarize(issues);
    return {
      items: issues.map(asPlanItem),
      skipped: [],
      estimate: {
        count: issues.length,
        note: `${summary.error} error(s), ${summary.warning} warning(s), ${summary.info} info`,
      },
    };
  },

  async run(scope: Scope, opts = {}): Promise<RunResult> {
    const issues = collectIssues(scope);
    const summary = summarize(issues);

    opts.onProgress?.({type: 'start', total: 1});

    const reportDir = path.join(DATA_DIR, '_meta');
    const reportPath = path.join(reportDir, 'health-report.json');
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, {recursive: true});
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          scope,
          summary,
          issues,
        },
        null,
        2,
      ),
    );

    const result: ItemResult = {
      id: 'health-report',
      label: 'data/_meta/health-report.json',
      status: 'ok',
      outputs: [path.relative(path.resolve('.'), reportPath)],
      detail: `${summary.error} errors, ${summary.warning} warnings, ${summary.info} info`,
    };
    opts.onProgress?.({type: 'item-end', result});
    opts.onProgress?.({type: 'done', done: [result], failed: []});
    return {done: [result], failed: []};
  },
};

registerStep(step);
