import { TopicMeta, Lesson, Note } from './types';

export interface IDataProvider {
  getTopics(): Promise<TopicMeta[]>;
  getTopic(topicId: string): Promise<TopicMeta | null>;
  getLessons(topicId: string): Promise<Lesson[]>;
  getLesson(topicId: string, lessonId: string): Promise<Lesson | null>;
  getNotesByTopic(topicId: string): Promise<Note[]>;
  getNotes(topicId: string, lessonId: string): Promise<Note[]>;
  
  // Write operations
  saveNote(note: Note, topicId: string): Promise<void>;
  deleteNote(noteId: string, lessonId: string, topicId: string): Promise<void>;
  saveAudioFile(audioBuffer: Buffer, noteId: string, lessonId: string, topicId: string, extension?: string): Promise<string>;
  getAudioFile(noteId: string, lessonId: string, topicId: string): Promise<{ buffer: Buffer, contentType: string } | null>;
  deleteAudioFile(noteId: string, lessonId: string, topicId: string): Promise<void>;
  
  deleteAudioFile(noteId: string, lessonId: string, topicId: string): Promise<void>;
  
  // Management operations
  saveLesson(lesson: Lesson, topicId: string): Promise<void>;
  deleteLesson(lessonId: string, topicId: string): Promise<void>;
  updateTopic(topic: TopicMeta): Promise<void>;
}
