import {Lesson, Note, LessonSection} from '../../../lib/types';
import {slugify} from '@/utils/topicUtils';
import RNFS from 'react-native-fs';
import {DOWNLOAD_DATA_PATH, EXTERNAL_DATA_PATH} from '@/utils/constants';
import {isFileOrFolderExists, getFullPath, deleteFile} from '@/utils/fsUtils';

/**
 * Create a lesson from a note
 */
export function createLessonFromNote(
  note: Note,
  topicId: string,
  order: number,
  previousLessonId: string | null = null,
  nextLessonId: string | null = null,
): Lesson {
  // Generate unique lesson ID by combining slugified title with timestamp
  const baseId = slugify(note.title) || 'lesson';
  const lessonId = `${baseId}-${Date.now()}`;
  const now = new Date().toISOString().split('T')[0];

  // Create sections based on note content
  const sections: LessonSection[] = [];

  // Add markdown content section if note has markdown
  if (note.markdown && note.markdown.trim()) {
    sections.push({
      id: `${lessonId}-content`,
      type: 'markdown',
      title: note.title,
      content: note.markdown,
      fileType: 'markdown',
    });
  }

  // Add audio section if note has audio file
  if (note.audioFile) {
    sections.push({
      id: `${lessonId}-audio`,
      type: 'file',
      title: 'Audio Recording',
      content: '',
      filePath: note.audioFile,
      fileType: 'other',
    });
  }

  // If no sections created, create a default content section
  if (sections.length === 0) {
    sections.push({
      id: `${lessonId}-content`,
      type: 'content',
      title: note.title,
      content: '',
    });
  }

  return {
    id: lessonId,
    title: note.title,
    topic: topicId,
    order,
    duration: '5 min',
    difficulty: 'beginner',
    objectives: [],
    sections,
    quiz: [],
    keyTakeaways: [],
    previousLesson: previousLessonId,
    nextLesson: nextLessonId,
    resources: [],
    lastUpdated: now,
  };
}

/**
 * Find the accessible data path (Download folder or external directory)
 */
async function findAccessibleDataPath(): Promise<string> {
  try {
    // First try to access Download folder
    const downloadFolderExists = await isFileOrFolderExists(DOWNLOAD_DATA_PATH);
    if (downloadFolderExists) {
      return DOWNLOAD_DATA_PATH;
    } else {
      // Try external directory
      const externalFolderExists = await isFileOrFolderExists(EXTERNAL_DATA_PATH);
      if (externalFolderExists) {
        return EXTERNAL_DATA_PATH;
      } else {
        // Fallback to Download path
        return DOWNLOAD_DATA_PATH;
      }
    }
  } catch (error) {
    console.error('Failed to find accessible data path:', error);
    // Fallback to Download path
    return DOWNLOAD_DATA_PATH;
  }
}

/**
 * Save lesson JSON file to the file system for persistence
 * This ensures the lesson persists across app reloads
 */
export async function saveLessonToFileSystem(lesson: Lesson): Promise<void> {
  try {
    // Find accessible data path
    const dataPath = await findAccessibleDataPath();
    
    // Create lesson file path: {dataPath}/{topicId}/lessons/{lessonId}.json
    const topicDir = getFullPath(dataPath, lesson.topic);
    const lessonsDir = getFullPath(topicDir, 'lessons');
    const lessonFilePath = getFullPath(lessonsDir, `${lesson.id}.json`);
    
    // Check if lessons directory exists
    const lessonsDirExists = await isFileOrFolderExists(lessonsDir);
    if (!lessonsDirExists) {
      console.error('Lessons directory does not exist:', lessonsDir);
      return; // Don't throw, just log and return
    }
    
    // Write lesson JSON file
    const lessonJsonContent = JSON.stringify(lesson, null, 2);
    await RNFS.writeFile(lessonFilePath, lessonJsonContent, 'utf8');
    console.log('Saved lesson to file system:', lessonFilePath);
  } catch (error) {
    console.error('Failed to save lesson to file system:', error);
    // Don't throw - allow lesson creation to continue even if file save fails
  }
}

/**
 * Delete lesson JSON file from the file system
 */
export async function deleteLessonFromFileSystem(lesson: Lesson): Promise<void> {
  try {
    // Find accessible data path
    const dataPath = await findAccessibleDataPath();
    
    // Create lesson file path: {dataPath}/{topicId}/lessons/{lessonId}.json
    const topicDir = getFullPath(dataPath, lesson.topic);
    const lessonsDir = getFullPath(topicDir, 'lessons');
    const lessonFilePath = getFullPath(lessonsDir, `${lesson.id}.json`);
    
    // Check if file exists before deleting
    const fileExists = await isFileOrFolderExists(lessonFilePath);
    if (fileExists) {
      await deleteFile(lessonFilePath);
      console.log('Deleted lesson from file system:', lessonFilePath);
    } else {
      console.log('Lesson file does not exist, skipping deletion:', lessonFilePath);
    }
  } catch (error) {
    console.error('Failed to delete lesson from file system:', error);
    // Don't throw - allow deletion to continue even if file deletion fails
  }
}
