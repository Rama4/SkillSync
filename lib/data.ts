import { TopicMeta, Lesson, Note } from './types';
import { IDataProvider } from './dataProvider';
import { FileSystemProvider } from './providers/fs';
import { GoogleDriveProvider } from './providers/drive';

// Determine which provider to use
const isDrive = process.env.DATA_SOURCE === 'drive';

export const dataProvider: IDataProvider = isDrive 
  ? new GoogleDriveProvider() 
  : new FileSystemProvider();

console.log(`Using Data Provider: ${isDrive ? 'Google Drive' : 'File System'}`);

// Re-export methods for backward compatibility
export async function getTopics(): Promise<TopicMeta[]> {
  return dataProvider.getTopics();
}

export async function getTopic(topicId: string): Promise<TopicMeta | null> {
  return dataProvider.getTopic(topicId);
}

export async function getLesson(topicId: string, lessonId: string): Promise<Lesson | null> {
  return dataProvider.getLesson(topicId, lessonId);
}

export async function getLessons(topicId: string): Promise<Lesson[]> {
  return dataProvider.getLessons(topicId);
}

export async function getNotesByTopic(topicId: string): Promise<Note[]> {
  return dataProvider.getNotesByTopic(topicId);
}

// Additional exports for methods that might be used by API routes
export async function getNotes(topicId: string, lessonId: string): Promise<Note[]> {
  return dataProvider.getNotes(topicId, lessonId);
}

export async function saveNote(note: Note, topicId: string): Promise<void> {
  return dataProvider.saveNote(note, topicId);
}

export async function deleteNote(noteId: string, lessonId: string, topicId: string): Promise<void> {
  return dataProvider.deleteNote(noteId, lessonId, topicId);
}

export async function saveAudioFile(audioBuffer: Buffer, noteId: string, lessonId: string, topicId: string, extension?: string): Promise<string> {
  return dataProvider.saveAudioFile(audioBuffer, noteId, lessonId, topicId, extension);
}

export async function getAudioFile(noteId: string, lessonId: string, topicId: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  return dataProvider.getAudioFile(noteId, lessonId, topicId);
}

export async function deleteAudioFile(noteId: string, lessonId: string, topicId: string): Promise<void> {
  return dataProvider.deleteAudioFile(noteId, lessonId, topicId);
}

export async function saveLesson(lesson: Lesson, topicId: string): Promise<void> {
  return dataProvider.saveLesson(lesson, topicId);
}

export async function deleteLesson(lessonId: string, topicId: string): Promise<void> {
  return dataProvider.deleteLesson(lessonId, topicId);
}

export async function updateTopic(topic: TopicMeta): Promise<void> {
  return dataProvider.updateTopic(topic);
}
