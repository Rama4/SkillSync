import {Lesson, Note, LessonSection} from '../../../lib/types';
import {slugify} from '@/utils/topicUtils';

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
