import {Lesson, Note, TopicMeta} from '../../../lib/types';
import {databaseService} from '@/services/database';
import {createTopicFolderStructure} from '@/utils/topicUtils';
import {saveLessonToFileSystem} from '@/utils/lessonUtils';
import {notesService} from '@/services/notesService';

/**
 * Constant for Quick Notes lesson ID pattern
 */
export const QUICK_NOTES_LESSON_ID_PREFIX = 'quick-notes-';

/**
 * Generate Quick Notes lesson ID for a topic
 */
export function getQuickNotesLessonId(topicId: string): string {
  return `${QUICK_NOTES_LESSON_ID_PREFIX}${topicId}`;
}

/**
 * Check if a lesson ID is a Quick Notes lesson
 */
export function isQuickNotesLesson(lessonId: string): boolean {
  return lessonId.startsWith(QUICK_NOTES_LESSON_ID_PREFIX);
}

/**
 * Get or create a "Quick Notes" lesson for a topic
 * This lesson serves as a temporary storage for quick recordings
 */
export async function getOrCreateQuickNotesLesson(topicId: string): Promise<Lesson> {
  try {
    const quickNotesLessonId = getQuickNotesLessonId(topicId);

    // Try to get existing Quick Notes lesson
    const existingLesson = await databaseService.getLesson(quickNotesLessonId);
    if (existingLesson) {
      return existingLesson;
    }

    // Create new Quick Notes lesson
    const topic = await databaseService.getTopic(topicId);
    if (!topic) {
      throw new Error(`Topic ${topicId} not found`);
    }

    // Determine order (should be first, but check existing lessons)
    const existingLessons = await databaseService.getLessonsByTopic(topicId);
    const order = existingLessons.length > 0 ? 0 : 1; // Place at beginning if lessons exist

    const now = new Date().toISOString().split('T')[0];
    const quickNotesLesson: Lesson = {
      id: quickNotesLessonId,
      title: 'Quick Notes',
      topic: topicId,
      order,
      duration: '0 min',
      difficulty: 'beginner',
      objectives: [],
      sections: [
        {
          id: `${quickNotesLessonId}-content`,
          type: 'content',
          title: 'Quick Notes',
          content: 'This lesson contains quick audio notes that can be organized later.',
        },
      ],
      quiz: [],
      keyTakeaways: [],
      previousLesson: null,
      nextLesson: existingLessons.length > 0 ? existingLessons[0].id : null,
      resources: [],
      lastUpdated: now,
    };

    // Update previous lesson's nextLesson reference if needed
    if (existingLessons.length > 0 && existingLessons[0].previousLesson === null) {
      const firstLesson = existingLessons[0];
      firstLesson.previousLesson = quickNotesLessonId;
      await databaseService.saveLesson(firstLesson);
      await saveLessonToFileSystem(firstLesson);
    }

    // Save Quick Notes lesson to database
    await databaseService.saveLesson(quickNotesLesson);

    // Save to file system
    await saveLessonToFileSystem(quickNotesLesson);

    // Update topic's lessons array
    const updatedTopic: TopicMeta = {
      ...topic,
      lessons: [
        {
          id: quickNotesLessonId,
          order,
          title: 'Quick Notes',
          duration: '0 min',
          difficulty: 'beginner',
        },
        ...topic.lessons.map(l => ({...l, order: l.order + 1})),
      ],
      lastUpdated: now,
    };
    await databaseService.saveTopic(updatedTopic);
    await createTopicFolderStructure(updatedTopic);

    return quickNotesLesson;
  } catch (error) {
    console.error('Failed to get or create Quick Notes lesson:', error);
    throw error;
  }
}

/**
 * Assign a note to a different lesson (move note between lessons)
 */
export async function assignNoteToLesson(
  note: Note,
  fromTopicId: string,
  fromLessonId: string,
  toTopicId: string,
  toLessonId: string,
): Promise<void> {
  try {
    // Get notes from source lesson
    const sourceNotes = notesService.getNotes(fromTopicId, fromLessonId);
    const noteIndex = sourceNotes.findIndex(n => n.id === note.id);

    if (noteIndex === -1) {
      throw new Error(`Note ${note.id} not found in source lesson`);
    }

    // Remove note from source lesson
    notesService.deleteNote(fromTopicId, fromLessonId, note.id);

    // Update note's lessonId
    const updatedNote: Note = {
      ...note,
      lessonId: toLessonId,
      updatedAt: new Date().toISOString(),
    };

    // Add note to target lesson
    notesService.saveNote(toTopicId, toLessonId, updatedNote);

    console.log(`Note ${note.id} moved from ${fromTopicId}/${fromLessonId} to ${toTopicId}/${toLessonId}`);
  } catch (error) {
    console.error('Failed to assign note to lesson:', error);
    throw error;
  }
}

