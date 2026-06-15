import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {DATA_DIR} from '@/lib/constants';
import {DEFAULT_TTS_MODEL, DEFAULT_TTS_VOICE, synthesize} from '@/lib/llm';
import {
  getLessonAudioDir,
  getLessonAudioManifest,
  getLessonAudioManifestPath,
  getLessonAudioRelPath,
  saveLessonAudio,
  saveLessonAudioManifest,
} from '@/lib/fileUtils';
import type {Lesson, LessonAudioChapter, LessonAudioManifest, LessonSection} from '@/lib/types';
import {registerStep} from '../registry';
import {fileInputKey, getRecord, setRecord} from '../state';
import {walkLessonFiles, type LessonFileRef} from '../scope';
import type {ItemResult, PipelineStep, PlanItem, PlanResult, RunResult, Scope} from '../types';

const STEP_ID = 'synthesize-lesson-audio';

// OpenAI TTS accepts up to 4096 characters per request; stay safely under it.
const MAX_TTS_CHARS = 3500;
// Rough narration pace (characters per second) used to estimate chapter offsets.
const CHARS_PER_SECOND = 14.5;

interface SpeakableSection {
  section: LessonSection;
  text: string;
}

/**
 * Reduce a markdown/string section to plain narration text: drop code blocks,
 * images, and markdown punctuation so the TTS voice reads cleanly.
 */
function markdownToSpeech(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, '') // fenced code blocks
    .replace(/`[^`]*`/g, '') // inline code
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '') // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // links -> link text
    .replace(/^#{1,6}\s+/gm, '') // heading markers
    .replace(/^\s*[-*+]\s+/gm, '') // bullet markers
    .replace(/^\s*>\s?/gm, '') // blockquotes
    .replace(/[*_~]/g, '') // emphasis markers
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function loadLesson(ref: LessonFileRef): Lesson | null {
  try {
    return JSON.parse(fs.readFileSync(ref.lessonPath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Build the speakable text for each section. Code-only and pure media sections
 * (video/image/audio/file) are skipped; markdown/text files are read from disk
 * when the section stores only a filePath.
 */
function speakableSections(lesson: Lesson, topicId: string): SpeakableSection[] {
  const out: SpeakableSection[] = [];
  for (const section of lesson.sections ?? []) {
    if (section.type === 'video' || section.type === 'image' || section.type === 'audio') continue;
    if (section.fileType === 'video' || section.fileType === 'image' || section.fileType === 'audio') {
      continue;
    }
    if (section.type === 'code') continue;

    let raw = section.content ?? '';
    const needsFile = !raw && section.filePath;
    if (needsFile && (section.fileType === 'markdown' || section.fileType === 'text')) {
      const abs = path.join(DATA_DIR, topicId, section.filePath as string);
      if (fs.existsSync(abs)) raw = fs.readFileSync(abs, 'utf-8');
    }

    const body = markdownToSpeech(raw);
    const title = section.title?.trim() ?? '';
    const text = [title, body].filter(Boolean).join('. ').trim();
    if (text.length > 0) out.push({section, text});
  }
  return out;
}

function lessonTextHash(sections: SpeakableSection[]): string {
  const joined = sections.map(s => `${s.section.id}:${s.text}`).join('\n---\n');
  return crypto.createHash('sha256').update(joined).digest('hex').slice(0, 16);
}

/**
 * Split long text into <= MAX_TTS_CHARS chunks at sentence/paragraph boundaries.
 */
function chunkText(text: string): string[] {
  if (text.length <= MAX_TTS_CHARS) return [text];
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if ((current + ' ' + sentence).length > MAX_TTS_CHARS && current) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

function estimateSeconds(charCount: number): number {
  return Math.max(1, Math.round(charCount / CHARS_PER_SECOND));
}

function itemIdFor(ref: LessonFileRef): string {
  return `${ref.topicId}/${ref.lessonId}`;
}

function makePlanItem(ref: LessonFileRef, sections: SpeakableSection[], reason: string): PlanItem {
  const chars = sections.reduce((acc, s) => acc + s.text.length, 0);
  return {
    id: itemIdFor(ref),
    label: itemIdFor(ref),
    action: `synthesize ${sections.length} section(s), ~${chars} chars via ${DEFAULT_TTS_MODEL}`,
    reason,
    inputs: [path.relative(DATA_DIR, ref.lessonPath)],
    outputs: [getLessonAudioRelPath(ref.lessonId, 'full.mp3')],
    meta: {topicId: ref.topicId, lessonId: ref.lessonId, chars},
  };
}

function isAlreadyDone(ref: LessonFileRef, hash: string): boolean {
  const manifest = getLessonAudioManifest(ref.topicId, ref.lessonId);
  if (!manifest) return false;
  return manifest.textHash === hash;
}

const step: PipelineStep = {
  id: STEP_ID,
  name: 'Synthesize lesson audio',
  description:
    'Turn lesson text into narrated MP3 audio (text-to-speech). Writes per-section ' +
    'clips, a stitched full.mp3, and an audio/manifest.json with chapters. Idempotent: ' +
    're-runs only when the lesson text changes. Requires OPENAI_API_KEY.',
  category: 'process',

  async plan(scope: Scope): Promise<PlanResult> {
    const lessons = walkLessonFiles(scope);
    const items: PlanItem[] = [];
    const skipped: PlanItem[] = [];
    for (const ref of lessons) {
      const lesson = loadLesson(ref);
      if (!lesson) continue;
      const sections = speakableSections(lesson, ref.topicId);
      if (sections.length === 0) continue;
      const hash = lessonTextHash(sections);
      if (isAlreadyDone(ref, hash)) {
        skipped.push(makePlanItem(ref, sections, 'narration up to date'));
      } else {
        items.push(makePlanItem(ref, sections, 'no narration or lesson text changed'));
      }
    }
    return {
      items,
      skipped,
      estimate: {
        count: items.length,
        note: items.length === 0 ? 'Nothing to do.' : `~1 TTS request per section.`,
      },
    };
  },

  async run(scope: Scope, opts = {}): Promise<RunResult> {
    const lessons = walkLessonFiles(scope);
    const byId = new Map(lessons.map(r => [itemIdFor(r), r] as const));
    const {items} = await this.plan(scope);
    const selected = opts.itemIds ? items.filter(i => opts.itemIds!.includes(i.id)) : items;

    opts.onProgress?.({type: 'start', total: selected.length});

    const done: ItemResult[] = [];
    const failed: ItemResult[] = [];

    for (const item of selected) {
      const ref = byId.get(item.id);
      if (!ref) continue;
      opts.onProgress?.({type: 'item-start', item});
      const startedAt = Date.now();

      try {
        const lesson = loadLesson(ref);
        if (!lesson) throw new Error('Lesson JSON disappeared between plan and run');
        const sections = speakableSections(lesson, ref.topicId);
        const hash = lessonTextHash(sections);

        const chapters: LessonAudioChapter[] = [];
        const fullParts: Buffer[] = [];
        let cursor = 0;
        let provider = '';
        let voice = DEFAULT_TTS_VOICE;
        let model = DEFAULT_TTS_MODEL;

        for (const {section, text} of sections) {
          const chunks = chunkText(text);
          const clipParts: Buffer[] = [];
          for (const chunk of chunks) {
            const result = await synthesize(chunk);
            clipParts.push(result.audio);
            provider = result.provider;
            voice = result.voice;
            model = result.model;
          }
          const clip = Buffer.concat(clipParts);
          const fileName = `${section.id}.mp3`;
          saveLessonAudio(clip, fileName, ref.lessonId, ref.topicId);
          fullParts.push(clip);

          const charCount = text.length;
          const duration = estimateSeconds(charCount);
          chapters.push({
            sectionId: section.id,
            title: section.title,
            file: getLessonAudioRelPath(ref.lessonId, fileName),
            start: cursor,
            duration,
            charCount,
          });
          cursor += duration;
        }

        saveLessonAudio(Buffer.concat(fullParts), 'full.mp3', ref.lessonId, ref.topicId);

        const manifest: LessonAudioManifest = {
          lessonId: ref.lessonId,
          voice,
          model,
          provider,
          format: 'mp3',
          fullFile: getLessonAudioRelPath(ref.lessonId, 'full.mp3'),
          duration: cursor,
          chapters,
          textHash: hash,
          generatedAt: new Date().toISOString(),
        };
        saveLessonAudioManifest(manifest, ref.topicId, ref.lessonId);

        const manifestPath = getLessonAudioManifestPath(ref.topicId, ref.lessonId);
        setRecord(STEP_ID, fileInputKey(ref.lessonPath), {
          completedAt: manifest.generatedAt,
          outputs: [path.relative(path.resolve('.'), manifestPath)],
          meta: {chapters: chapters.length, durationSec: cursor, voice, model},
        });

        const result: ItemResult = {
          id: item.id,
          label: item.label,
          status: 'ok',
          outputs: [path.relative(DATA_DIR, getLessonAudioDir(ref.topicId, ref.lessonId))],
          detail: `${chapters.length} chapters, ~${cursor}s`,
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
