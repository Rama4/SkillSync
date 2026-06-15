import fs from 'fs';
import path from 'path';
import {DATA_DIR} from '@/lib/constants';
import type {Scope} from './types';

const AUDIO_EXTENSIONS = ['.webm', '.mp3', '.m4a', '.wav', '.mp4', '.ogg'];

export interface AudioFileRef {
  absolutePath: string;
  relativePath: string;
  topicId: string;
  lessonId: string;
  noteId: string;
  fileName: string;
  extension: string;
  size: number;
  mtimeMs: number;
}

export interface NoteRef {
  topicId: string;
  lessonId: string;
  noteId: string;
  notePath: string;
}

export interface LessonFileRef {
  topicId: string;
  lessonId: string;
  lessonPath: string;
}

export interface TopicRef {
  topicId: string;
  topicJsonPath: string;
}

export function listTopics(): TopicRef[] {
  if (!fs.existsSync(DATA_DIR)) return [];
  const out: TopicRef[] = [];
  for (const entry of fs.readdirSync(DATA_DIR, {withFileTypes: true})) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith('_') || entry.name.startsWith('.')) continue;
    const topicJsonPath = path.join(DATA_DIR, entry.name, 'topic.json');
    if (!fs.existsSync(topicJsonPath)) continue;
    out.push({topicId: entry.name, topicJsonPath});
  }
  return out;
}

function scopedTopicIds(scope: Scope): string[] {
  if (scope.kind === 'topic') return [scope.topicId];
  return listTopics().map(t => t.topicId);
}

/**
 * Walk all audio files under data/{topic}/lessons/{lesson}/notes/audio/.
 * Filters by known audio extensions so transcript sidecars are ignored.
 */
export function walkAudioFiles(scope: Scope): AudioFileRef[] {
  const out: AudioFileRef[] = [];
  for (const topicId of scopedTopicIds(scope)) {
    const lessonsDir = path.join(DATA_DIR, topicId, 'lessons');
    if (!fs.existsSync(lessonsDir)) continue;
    for (const lessonEntry of fs.readdirSync(lessonsDir, {withFileTypes: true})) {
      if (!lessonEntry.isDirectory()) continue;
      const lessonId = lessonEntry.name;
      const audioDir = path.join(lessonsDir, lessonId, 'notes', 'audio');
      if (!fs.existsSync(audioDir)) continue;
      for (const audioEntry of fs.readdirSync(audioDir, {withFileTypes: true})) {
        if (!audioEntry.isFile()) continue;
        const ext = path.extname(audioEntry.name).toLowerCase();
        if (!AUDIO_EXTENSIONS.includes(ext)) continue;
        const absolutePath = path.join(audioDir, audioEntry.name);
        const stat = fs.statSync(absolutePath);
        out.push({
          absolutePath,
          relativePath: path.relative(DATA_DIR, absolutePath),
          topicId,
          lessonId,
          noteId: path.basename(audioEntry.name, ext),
          fileName: audioEntry.name,
          extension: ext,
          size: stat.size,
          mtimeMs: stat.mtimeMs,
        });
      }
    }
  }
  return out;
}

/**
 * Walk all note JSON files under data/{topic}/lessons/{lesson}/notes/.
 * Excludes notes.json (the index file) and audio/ subdir.
 */
export function walkNotes(scope: Scope): NoteRef[] {
  const out: NoteRef[] = [];
  for (const topicId of scopedTopicIds(scope)) {
    const lessonsDir = path.join(DATA_DIR, topicId, 'lessons');
    if (!fs.existsSync(lessonsDir)) continue;
    for (const lessonEntry of fs.readdirSync(lessonsDir, {withFileTypes: true})) {
      if (!lessonEntry.isDirectory()) continue;
      const lessonId = lessonEntry.name;
      const notesDir = path.join(lessonsDir, lessonId, 'notes');
      if (!fs.existsSync(notesDir)) continue;
      for (const noteEntry of fs.readdirSync(notesDir, {withFileTypes: true})) {
        if (!noteEntry.isFile()) continue;
        if (!noteEntry.name.endsWith('.json')) continue;
        if (noteEntry.name === 'notes.json') continue;
        out.push({
          topicId,
          lessonId,
          noteId: path.basename(noteEntry.name, '.json'),
          notePath: path.join(notesDir, noteEntry.name),
        });
      }
    }
  }
  return out;
}

/**
 * Walk all lesson JSON files at data/{topic}/lessons/{lessonId}.json.
 * These are files (not directories); the per-lesson notes/ and audio/ dirs
 * live alongside them under data/{topic}/lessons/{lessonId}/.
 */
export function walkLessonFiles(scope: Scope): LessonFileRef[] {
  const out: LessonFileRef[] = [];
  for (const topicId of scopedTopicIds(scope)) {
    const lessonsDir = path.join(DATA_DIR, topicId, 'lessons');
    if (!fs.existsSync(lessonsDir)) continue;
    for (const entry of fs.readdirSync(lessonsDir, {withFileTypes: true})) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      out.push({
        topicId,
        lessonId: path.basename(entry.name, '.json'),
        lessonPath: path.join(lessonsDir, entry.name),
      });
    }
  }
  return out;
}

/**
 * Sidecar transcript path: {audioDir}/{noteId}.transcript.json
 * Always lives beside the audio file.
 */
export function transcriptPathFor(audioAbsPath: string): string {
  const dir = path.dirname(audioAbsPath);
  const ext = path.extname(audioAbsPath);
  const noteId = path.basename(audioAbsPath, ext);
  return path.join(dir, `${noteId}.transcript.json`);
}

export function parseScope(input: string | undefined): Scope {
  if (!input || input === 'all') return {kind: 'all'};
  const m = /^topic:(.+)$/.exec(input);
  if (m) return {kind: 'topic', topicId: m[1]};
  throw new Error(`Invalid scope '${input}'. Use 'all' or 'topic:<id>'.`);
}

export function formatScope(scope: Scope): string {
  return scope.kind === 'all' ? 'all' : `topic:${scope.topicId}`;
}
