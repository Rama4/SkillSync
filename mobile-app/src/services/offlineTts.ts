import Tts from 'react-native-tts';
import {Lesson, LessonSection} from '../../../lib/types';

let initialised = false;

async function ensureInit(): Promise<void> {
  if (initialised) return;
  try {
    await Tts.getInitStatus();
  } catch (err: any) {
    // On some devices the engine needs to be installed before first use.
    if (err?.code === 'no_engine') {
      Tts.requestInstallEngine();
    }
  }
  Tts.setDefaultRate(0.5);
  initialised = true;
}

/**
 * Strip markdown to plain narration text, mirroring the server-side TTS pipeline
 * so on-device speech reads cleanly.
 */
function sectionToSpeech(section: LessonSection): string {
  if (section.type === 'video' || section.type === 'image' || section.type === 'audio') return '';
  if (section.type === 'code') return '';
  const raw = section.content ?? '';
  const body = raw
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/[*_~>]/g, '')
    .trim();
  return [section.title, body].filter(Boolean).join('. ');
}

export const offlineTts = {
  /**
   * Speak a lesson using the device's built-in text-to-speech engine. Used as an
   * offline fallback when no cached narration audio is available.
   */
  async speakLesson(lesson: Lesson): Promise<void> {
    await ensureInit();
    Tts.stop();
    for (const section of lesson.sections ?? []) {
      const text = sectionToSpeech(section);
      if (text) Tts.speak(text);
    }
  },

  async speakText(text: string): Promise<void> {
    await ensureInit();
    Tts.stop();
    if (text.trim()) Tts.speak(text);
  },

  stop(): void {
    Tts.stop();
  },
};
