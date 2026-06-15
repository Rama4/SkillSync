import fs from 'fs';
import path from 'path';
import {MediaFile, TopicMeta, LessonMeta, Lesson, Note, NotesIndex, LessonAudioManifest} from './types';

const DATA_DIR = path.join(process.cwd(), 'data');

/**
 * Generate a URL-friendly slug from a string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Get file type based on extension
 */
export function getFileType(filename: string): 'video' | 'markdown' | 'image' | 'text' | 'other' {
  const ext = path.extname(filename).toLowerCase();
  const videoExts = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
  const markdownExts = ['.md', '.markdown'];
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
  const textExts = ['.txt', '.text'];

  if (videoExts.includes(ext)) return 'video';
  if (markdownExts.includes(ext)) return 'markdown';
  if (imageExts.includes(ext)) return 'image';
  if (textExts.includes(ext)) return 'text';
  return 'other';
}

/**
 * Scan directory for media files
 */
export function scanMediaFiles(directory: string): MediaFile[] {
  const files: MediaFile[] = [];
  const fullPath = path.join(DATA_DIR, directory);

  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
    return files;
  }

  try {
    const entries = fs.readdirSync(fullPath, {withFileTypes: true});

    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = path.join(directory, entry.name);
        const stats = fs.statSync(path.join(fullPath, entry.name));

        files.push({
          path: filePath,
          name: entry.name,
          type: getFileType(entry.name),
          size: stats.size,
        });
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${directory}:`, error);
  }

  return files;
}

/**
 * Copy file from source to destination
 */
export function copyFile(sourcePath: string, destPath: string): void {
  const fullSourcePath = path.join(DATA_DIR, sourcePath);
  const fullDestPath = path.join(DATA_DIR, destPath);

  // Ensure destination directory exists
  const destDir = path.dirname(fullDestPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, {recursive: true});
  }

  fs.copyFileSync(fullSourcePath, fullDestPath);
}

/**
 * Generate lesson ID from filename
 */
export function generateLessonId(filename: string, index: number): string {
  const nameWithoutExt = path.parse(filename).name;
  return slugify(nameWithoutExt) || `lesson-${index + 1}`;
}

/**
 * Generate lesson title from filename
 */
export function generateLessonTitle(filename: string): string {
  const nameWithoutExt = path.parse(filename).name;
  // Clean up common patterns like [VIDEO_ID] or (video_id)
  return (
    nameWithoutExt
      .replace(/\[.*?\]/g, '')
      .replace(/\(.*?\)/g, '')
      .trim()
      .replace(/\s+/g, ' ') || path.parse(filename).name
  );
}

/**
 * Estimate duration for a video file (placeholder - would need actual video metadata)
 */
export function estimateDuration(fileType: string, size?: number): string {
  if (fileType === 'video' && size) {
    // Rough estimate: ~1MB per minute for compressed video
    const estimatedMinutes = Math.max(1, Math.round(size / (1024 * 1024)));
    return `${estimatedMinutes} min`;
  }
  if (fileType === 'markdown') {
    return '5 min'; // Default for markdown
  }
  return '10 min'; // Default
}

/**
 * Generate lesson JSON from media file
 */
export function generateLessonFromMedia(
  mediaFile: MediaFile,
  topicId: string,
  order: number,
  previousLessonId: string | null,
  nextLessonId: string | null,
): Lesson {
  const lessonId = generateLessonId(mediaFile.name, order - 1);
  const title = generateLessonTitle(mediaFile.name);
  const mediaPath = `media/${mediaFile.name}`;

  // Create appropriate section based on file type
  let section;
  if (mediaFile.type === 'video') {
    section = {
      id: `${lessonId}-video`,
      type: 'video' as const,
      title: title,
      content: '',
      videoUrl: `/api/media/${topicId}/${mediaPath}`,
      filePath: mediaPath,
      fileType: 'video' as const,
    };
  } else if (mediaFile.type === 'markdown') {
    // Read markdown content
    const markdownPath = path.join(DATA_DIR, mediaFile.path);
    let content = '';
    if (fs.existsSync(markdownPath)) {
      content = fs.readFileSync(markdownPath, 'utf-8');
    }

    section = {
      id: `${lessonId}-content`,
      type: 'markdown' as const,
      title: title,
      content: content,
      filePath: mediaPath,
      fileType: 'markdown' as const,
    };
  } else {
    section = {
      id: `${lessonId}-file`,
      type: 'file' as const,
      title: title,
      content: `File: ${mediaFile.name}`,
      filePath: mediaPath,
      fileType: 'other' as const,
    };
  }

  return {
    id: lessonId,
    title: title,
    topic: topicId,
    order: order,
    objectives: [`Learn from ${mediaFile.name}`],
    sections: [section],
    quiz: [],
    keyTakeaways: [],
    previousLesson: previousLessonId,
    nextLesson: nextLessonId,
    resources: [],
    lastUpdated: new Date().toISOString().split('T')[0],
  };
}

/**
 * Generate topic.json from registration data
 */
export function generateTopicJson(
  topicId: string,
  title: string,
  description: string,
  tags: string[],
  lessons: Lesson[],
): TopicMeta {
  const lessonMetas: LessonMeta[] = lessons.map(lesson => ({
    id: lesson.id,
    order: lesson.order,
    title: lesson.title,
  }));

  return {
    id: topicId,
    title,
    description,
    lessons: lessonMetas,
    tags,
    lastUpdated: new Date().toISOString().split('T')[0],
  };
}

/**
 * Create topic directory structure
 */
export function createTopicDirectory(topicId: string): {
  topicDir: string;
  lessonsDir: string;
  mediaDir: string;
} {
  const topicDir = path.join(DATA_DIR, topicId);
  const lessonsDir = path.join(topicDir, 'lessons');
  const mediaDir = path.join(topicDir, 'media');

  // Create directories
  if (!fs.existsSync(topicDir)) {
    fs.mkdirSync(topicDir, {recursive: true});
  }
  if (!fs.existsSync(lessonsDir)) {
    fs.mkdirSync(lessonsDir, {recursive: true});
  }
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, {recursive: true});
  }

  return {topicDir, lessonsDir, mediaDir};
}

/**
 * Update the topics index file (data/topics.json)
 */
export function updateTopicsIndex(topicMeta: TopicMeta): void {
  const topicsIndexPath = path.join(DATA_DIR, 'topics.json');

  // Read existing topics index or create new one
  let topicsIndex: {
    version: string;
    lastUpdated: string;
    topics: Array<{
      id: string;
      title: string;
      description: string;
      lastUpdated: string;
      lessonCount: number;
      tags: string[];
    }>;
  };

  if (fs.existsSync(topicsIndexPath)) {
    try {
      topicsIndex = JSON.parse(fs.readFileSync(topicsIndexPath, 'utf-8'));
    } catch (error) {
      console.error('Error reading topics index:', error);
      // Create new index if file is corrupted
      topicsIndex = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString().split('T')[0],
        topics: [],
      };
    }
  } else {
    // Create new topics index
    topicsIndex = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString().split('T')[0],
      topics: [],
    };
  }

  // Create topic summary for index
  const topicSummary = {
    id: topicMeta.id,
    title: topicMeta.title,
    description: topicMeta.description,
    version: '1.0.0',
    lastUpdated: topicMeta.lastUpdated,
    lessonCount: topicMeta.lessons.length,
    tags: topicMeta.tags,
  };

  // Remove existing entry if it exists (update case)
  topicsIndex.topics = topicsIndex.topics.filter(t => t.id !== topicMeta.id);

  // Add new/updated topic
  topicsIndex.topics.push(topicSummary);

  // Update lastUpdated
  topicsIndex.lastUpdated = new Date().toISOString().split('T')[0];

  // Write back to file
  fs.writeFileSync(topicsIndexPath, JSON.stringify(topicsIndex, null, 2), 'utf-8');
}

/**
 * Get notes directory path for a lesson
 */
export function getNotesDir(topicId: string, lessonId: string): string {
  return path.join(DATA_DIR, topicId, 'lessons', lessonId, 'notes');
}

/**
 * Get notes index file path
 */
export function getNotesIndexPath(topicId: string, lessonId: string): string {
  return path.join(getNotesDir(topicId, lessonId), 'notes.json');
}

/**
 * Get note file path
 */
export function getNotePath(topicId: string, lessonId: string, noteId: string): string {
  return path.join(getNotesDir(topicId, lessonId), `${noteId}.json`);
}

/**
 * Get audio file path for a note
 */
export function getAudioPath(topicId: string, lessonId: string, noteId: string): string {
  return path.join(getNotesDir(topicId, lessonId), 'audio', `${noteId}.mp3`);
}

/**
 * Get all notes for a lesson
 */
export function getNotes(topicId: string, lessonId: string): Note[] {
  const notesDir = getNotesDir(topicId, lessonId);
  const indexPath = getNotesIndexPath(topicId, lessonId);

  try {
    if (!fs.existsSync(notesDir) || !fs.existsSync(indexPath)) {
      return [];
    }

    const index: NotesIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    const notes: Note[] = [];

    for (const noteId of index.notes) {
      const notePath = getNotePath(topicId, lessonId, noteId);
      if (fs.existsSync(notePath)) {
        const note: Note = JSON.parse(fs.readFileSync(notePath, 'utf-8'));
        notes.push(note);
      }
    }

    // Sort by createdAt (newest first)
    notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return notes;
  } catch (error) {
    console.error(`Error reading notes for lesson ${lessonId}:`, error);
    return [];
  }
}

/**
 * Save a note
 */
export function saveNote(note: Note, topicId: string): void {
  const notesDir = getNotesDir(topicId, note.lessonId);
  const audioDir = path.join(notesDir, 'audio');
  const indexPath = getNotesIndexPath(topicId, note.lessonId);

  // Create directories if they don't exist
  if (!fs.existsSync(notesDir)) {
    fs.mkdirSync(notesDir, {recursive: true});
  }
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, {recursive: true});
  }

  // Read or create index
  let index: NotesIndex;
  if (fs.existsSync(indexPath)) {
    index = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  } else {
    index = {notes: [], lastUpdated: new Date().toISOString()};
  }

  // Add note ID to index if not present
  if (!index.notes.includes(note.id)) {
    index.notes.push(note.id);
  }

  // Update timestamps
  index.lastUpdated = new Date().toISOString();
  note.updatedAt = new Date().toISOString();
  if (!note.createdAt) {
    note.createdAt = note.updatedAt;
  }

  // Save note file
  const notePath = getNotePath(topicId, note.lessonId, note.id);
  fs.writeFileSync(notePath, JSON.stringify(note, null, 2), 'utf-8');

  // Save index
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
}

/**
 * Delete a note
 */
export function deleteNote(noteId: string, lessonId: string, topicId: string): void {
  const notesDir = getNotesDir(topicId, lessonId);
  const indexPath = getNotesIndexPath(topicId, lessonId);
  const notePath = getNotePath(topicId, lessonId, noteId);

  // Delete note file
  if (fs.existsSync(notePath)) {
    fs.unlinkSync(notePath);
  }

  // Delete audio files if they exist (try different extensions)
  const audioDir = path.join(notesDir, 'audio');
  const possibleExtensions = ['webm', 'mp3', 'm4a', 'wav', 'mp4'];

  for (const ext of possibleExtensions) {
    const audioPath = path.join(audioDir, `${noteId}.${ext}`);
    if (fs.existsSync(audioPath)) {
      try {
        fs.unlinkSync(audioPath);
        break; // Only delete the first match
      } catch (error) {
        console.error(`Error deleting audio file ${audioPath}:`, error);
      }
    }
  }

  // Update index
  if (fs.existsSync(indexPath)) {
    const index: NotesIndex = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    index.notes = index.notes.filter(id => id !== noteId);
    index.lastUpdated = new Date().toISOString();
    fs.writeFileSync(indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }
}

/**
 * Save audio file for a note
 */
export function saveAudioFile(
  audioBuffer: Buffer,
  noteId: string,
  lessonId: string,
  topicId: string,
  extension: string = 'webm',
): string {
  const audioDir = path.join(getNotesDir(topicId, lessonId), 'audio');

  // Create audio directory if it doesn't exist
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, {recursive: true});
  }

  const audioPath = path.join(audioDir, `${noteId}.${extension}`);
  fs.writeFileSync(audioPath, audioBuffer);

  return `audio/${noteId}.${extension}`;
}

/**
 * Generate section ID
 */
export function generateSectionId(lessonId: string, index: number): string {
  return `${lessonId}-section-${index + 1}`;
}

/**
 * Directory holding a lesson's generated narration audio + manifest.
 * Lives parallel to the notes/audio layout: lessons/{lessonId}/audio/.
 */
export function getLessonAudioDir(topicId: string, lessonId: string): string {
  return path.join(DATA_DIR, topicId, 'lessons', lessonId, 'audio');
}

/**
 * Path to a lesson narration file, relative to the topic folder.
 * Used both on disk (joined with DATA_DIR) and as the suffix of an /api/media URL.
 */
export function getLessonAudioRelPath(lessonId: string, fileName: string): string {
  return `lessons/${lessonId}/audio/${fileName}`;
}

export function getLessonAudioManifestPath(topicId: string, lessonId: string): string {
  return path.join(getLessonAudioDir(topicId, lessonId), 'manifest.json');
}

/**
 * Write a lesson narration buffer and return its path relative to the topic folder.
 */
export function saveLessonAudio(
  audioBuffer: Buffer,
  fileName: string,
  lessonId: string,
  topicId: string,
): string {
  const audioDir = getLessonAudioDir(topicId, lessonId);
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, {recursive: true});
  }
  fs.writeFileSync(path.join(audioDir, fileName), audioBuffer);
  return getLessonAudioRelPath(lessonId, fileName);
}

export function saveLessonAudioManifest(
  manifest: LessonAudioManifest,
  topicId: string,
  lessonId: string,
): void {
  const audioDir = getLessonAudioDir(topicId, lessonId);
  if (!fs.existsSync(audioDir)) {
    fs.mkdirSync(audioDir, {recursive: true});
  }
  fs.writeFileSync(
    getLessonAudioManifestPath(topicId, lessonId),
    JSON.stringify(manifest, null, 2),
    'utf-8',
  );
}

export function getLessonAudioManifest(
  topicId: string,
  lessonId: string,
): LessonAudioManifest | null {
  const manifestPath = getLessonAudioManifestPath(topicId, lessonId);
  if (!fs.existsSync(manifestPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  } catch (error) {
    console.error(`Error reading lesson audio manifest for ${lessonId}:`, error);
    return null;
  }
}

/**
 * Get lesson file path
 */
export function getLessonPath(topicId: string, lessonId: string): string {
  return path.join(DATA_DIR, topicId, 'lessons', `${lessonId}.json`);
}

/**
 * Save a lesson to file system
 */
export function saveLesson(lesson: Lesson, topicId: string): void {
  const lessonPath = getLessonPath(topicId, lesson.id);
  const lessonsDir = path.dirname(lessonPath);

  // Ensure lessons directory exists
  if (!fs.existsSync(lessonsDir)) {
    fs.mkdirSync(lessonsDir, {recursive: true});
  }

  // Update lastUpdated timestamp
  lesson.lastUpdated = new Date().toISOString().split('T')[0];

  // Save lesson file
  fs.writeFileSync(lessonPath, JSON.stringify(lesson, null, 2), 'utf-8');
}

/**
 * Delete a lesson from file system
 */
export function deleteLesson(lessonId: string, topicId: string): void {
  const lessonPath = getLessonPath(topicId, lessonId);
  const notesDir = getNotesDir(topicId, lessonId);

  // Delete lesson file
  if (fs.existsSync(lessonPath)) {
    fs.unlinkSync(lessonPath);
  }

  // Delete notes directory recursively
  if (fs.existsSync(notesDir)) {
    fs.rmSync(notesDir, {recursive: true, force: true});
  }
}

/**
 * Update topic metadata with new lesson list
 */
export function updateTopicMeta(topicId: string, lessonMetas: LessonMeta[]): void {
  const topicPath = path.join(DATA_DIR, topicId, 'topic.json');

  if (!fs.existsSync(topicPath)) {
    console.error(`Topic file not found: ${topicPath}`);
    return;
  }

  try {
    const topicMeta: TopicMeta = JSON.parse(fs.readFileSync(topicPath, 'utf-8'));
    topicMeta.lessons = lessonMetas;
    topicMeta.lastUpdated = new Date().toISOString().split('T')[0];

    fs.writeFileSync(topicPath, JSON.stringify(topicMeta, null, 2), 'utf-8');
  } catch (error) {
    console.error(`Error updating topic metadata for ${topicId}:`, error);
  }
}
