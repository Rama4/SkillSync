// Thin wrapper around the OpenAI SDK pointed at Groq's compatible endpoint.
// Used by pipeline steps (and future agent routes) so we have one chokepoint
// for model defaults, env vars, and error shaping.

import OpenAI from 'openai';
import type {ChatCompletionMessageParam} from 'openai/resources/chat/completions';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

export const DEFAULT_CHAT_MODEL = process.env.GROQ_CHAT_MODEL ?? 'llama-3.3-70b-versatile';
export const DEFAULT_TRANSCRIBE_MODEL =
  process.env.GROQ_TRANSCRIBE_MODEL ?? 'whisper-large-v3-turbo';

export const DEFAULT_TTS_MODEL = process.env.TTS_MODEL ?? 'tts-1';
export const DEFAULT_TTS_VOICE = process.env.TTS_VOICE ?? 'alloy';

let cached: OpenAI | null = null;
let cachedTts: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'gsk_replace_me') {
    throw new Error(
      'GROQ_API_KEY is not set. Copy .env.local.example to .env.local and add your key from https://console.groq.com',
    );
  }
  if (!cached) {
    cached = new OpenAI({apiKey, baseURL: GROQ_BASE_URL});
  }
  return cached;
}

/**
 * TTS uses a separate client so the chat/transcribe path can keep pointing at
 * Groq while speech synthesis hits OpenAI (or any compatible endpoint via
 * TTS_BASE_URL). Falls back to GROQ_API_KEY when an OpenAI key is not provided.
 */
function getTtsClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY ?? process.env.TTS_API_KEY;
  if (!apiKey) {
    throw new Error(
      'OPENAI_API_KEY is not set. Add it to .env.local to enable text-to-speech, ' +
        'or set TTS_BASE_URL/TTS_API_KEY to use a compatible provider.',
    );
  }
  if (!cachedTts) {
    cachedTts = new OpenAI({apiKey, baseURL: process.env.TTS_BASE_URL});
  }
  return cachedTts;
}

export const TTS_PROVIDER = process.env.TTS_BASE_URL ? 'custom' : 'openai';

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function chat(messages: ChatCompletionMessageParam[], opts: ChatOptions = {}): Promise<string> {
  const client = getClient();
  const completion = await client.chat.completions.create({
    model: opts.model ?? DEFAULT_CHAT_MODEL,
    messages,
    temperature: opts.temperature ?? 0.3,
    max_tokens: opts.maxTokens,
  });
  return completion.choices[0]?.message?.content ?? '';
}

export interface TranscribeOptions {
  model?: string;
  language?: string;
  prompt?: string;
  // 'json' (text only), 'verbose_json' (text + segments + timestamps), 'text'
  responseFormat?: 'json' | 'verbose_json' | 'text';
}

export interface TranscriptResult {
  text: string;
  segments?: Array<{id: number; start: number; end: number; text: string}>;
  language?: string;
  duration?: number;
  model: string;
}

/**
 * Transcribe an audio file via Groq Whisper.
 * Accepts either a File/Blob (browser/edge) or a Node.js readable stream / Buffer
 * wrapped via openai's `toFile` helper at the call site.
 */
export async function transcribe(
  file: Parameters<OpenAI['audio']['transcriptions']['create']>[0]['file'],
  opts: TranscribeOptions = {},
): Promise<TranscriptResult> {
  const client = getClient();
  const model = opts.model ?? DEFAULT_TRANSCRIBE_MODEL;
  const responseFormat = opts.responseFormat ?? 'verbose_json';

  const res = await client.audio.transcriptions.create({
    file,
    model,
    language: opts.language,
    prompt: opts.prompt,
    response_format: responseFormat,
  });

  // SDK return type is a union (string for 'text', object otherwise). Normalize.
  if (typeof res === 'string') {
    return {text: res, model};
  }
  // verbose_json includes segments + language + duration; json is text-only.
  const anyRes = res as {
    text: string;
    segments?: TranscriptResult['segments'];
    language?: string;
    duration?: number;
  };
  return {
    text: anyRes.text,
    segments: anyRes.segments,
    language: anyRes.language,
    duration: anyRes.duration,
    model,
  };
}

export interface SynthesizeOptions {
  model?: string;
  voice?: string;
  format?: 'mp3' | 'wav' | 'opus' | 'aac' | 'flac';
}

export interface SynthesisResult {
  audio: Buffer;
  model: string;
  voice: string;
  format: string;
  provider: string;
}

/**
 * Convert text to speech and return the raw audio bytes. Defaults to OpenAI's
 * `tts-1` model with the `alloy` voice; both are overridable via env or opts.
 */
export async function synthesize(
  text: string,
  opts: SynthesizeOptions = {},
): Promise<SynthesisResult> {
  const client = getTtsClient();
  const model = opts.model ?? DEFAULT_TTS_MODEL;
  const voice = opts.voice ?? DEFAULT_TTS_VOICE;
  const format = opts.format ?? 'mp3';

  const response = await client.audio.speech.create({
    model,
    voice,
    input: text,
    response_format: format,
  });

  const audio = Buffer.from(await response.arrayBuffer());
  return {audio, model, voice, format, provider: TTS_PROVIDER};
}

// Re-export the SDK file helper so steps can wrap Node Buffers without depending on
// the openai package directly.
export {toFile} from 'openai';
