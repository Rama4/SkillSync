import RNFS from 'react-native-fs';
import {LessonAudioManifest} from '../../../lib/types';
import {API_BASE_URL, DOWNLOAD_DATA_PATH, EXTERNAL_DATA_PATH} from '@/utils/constants';
import {isFileOrFolderExists, readJsonFile} from '@/utils/fsUtils';

export interface ResolvedLessonAudio {
  manifest: LessonAudioManifest;
  // A URI ready for TrackPlayer: file:// for offline, http:// for streaming.
  fullUri: string;
  isLocal: boolean;
}

/**
 * Topic-relative path the web app records in the manifest, e.g.
 * "lessons/intro/audio/full.mp3". Used to build both local and remote URIs.
 */
function topicRelative(lessonId: string, fileName: string): string {
  return `lessons/${lessonId}/audio/${fileName}`;
}

async function resolveDataRoot(): Promise<string> {
  if (await isFileOrFolderExists(DOWNLOAD_DATA_PATH)) return DOWNLOAD_DATA_PATH;
  return EXTERNAL_DATA_PATH;
}

export function remoteMediaUrl(topicId: string, relPath: string): string {
  return `${API_BASE_URL}/api/media/${topicId}/${relPath}`;
}

export async function localLessonAudioDir(topicId: string, lessonId: string): Promise<string> {
  const root = await resolveDataRoot();
  return `${root}/${topicId}/lessons/${lessonId}/audio`;
}

/**
 * Load a lesson's narration manifest from the locally synced data folder.
 * Returns null when no narration has been generated/synced for the lesson.
 */
export async function loadLocalManifest(
  topicId: string,
  lessonId: string,
): Promise<LessonAudioManifest | null> {
  try {
    const dir = await localLessonAudioDir(topicId, lessonId);
    const manifestPath = `${dir}/manifest.json`;
    if (!(await isFileOrFolderExists(manifestPath))) return null;
    return (await readJsonFile(manifestPath)) as LessonAudioManifest;
  } catch {
    return null;
  }
}

/**
 * Download a lesson's narration (manifest + full.mp3 + per-chapter clips) from
 * the running web server into the local data folder for offline playback.
 */
export async function downloadLessonAudio(
  topicId: string,
  lessonId: string,
): Promise<LessonAudioManifest | null> {
  try {
    const manifestUrl = remoteMediaUrl(topicId, topicRelative(lessonId, 'manifest.json'));
    const res = await fetch(manifestUrl);
    if (!res.ok) return null;
    const manifest = (await res.json()) as LessonAudioManifest;

    const dir = await localLessonAudioDir(topicId, lessonId);
    await RNFS.mkdir(dir);

    const files = ['full.mp3', 'manifest.json', ...manifest.chapters.map(c => fileNameOf(c.file))];
    for (const fileName of Array.from(new Set(files))) {
      const fromUrl = remoteMediaUrl(topicId, topicRelative(lessonId, fileName));
      const toFile = `${dir}/${fileName}`;
      await RNFS.downloadFile({fromUrl, toFile}).promise;
    }

    return manifest;
  } catch (error) {
    console.error('downloadLessonAudio failed:', error);
    return null;
  }
}

function fileNameOf(p: string): string {
  const parts = p.split('/');
  return parts[parts.length - 1];
}

/**
 * Resolve the best available narration source for a lesson, preferring the
 * locally synced/downloaded copy and falling back to streaming from the server.
 */
export async function resolveLessonAudio(
  topicId: string,
  lessonId: string,
): Promise<ResolvedLessonAudio | null> {
  const local = await loadLocalManifest(topicId, lessonId);
  if (local) {
    const dir = await localLessonAudioDir(topicId, lessonId);
    const fullName = fileNameOf(local.fullFile);
    return {manifest: local, fullUri: `file://${dir}/${fullName}`, isLocal: true};
  }

  try {
    const manifestUrl = remoteMediaUrl(topicId, topicRelative(lessonId, 'manifest.json'));
    const res = await fetch(manifestUrl);
    if (!res.ok) return null;
    const manifest = (await res.json()) as LessonAudioManifest;
    return {
      manifest,
      fullUri: remoteMediaUrl(topicId, manifest.fullFile),
      isLocal: false,
    };
  } catch {
    return null;
  }
}
