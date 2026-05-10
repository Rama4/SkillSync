import { IDataProvider } from '../dataProvider';
import { TopicMeta, Lesson, Note } from '../types';
import { getNotes, saveNote, deleteNote, saveAudioFile, saveLesson, deleteLesson, updateTopicMeta } from '../fileUtils';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

export class FileSystemProvider implements IDataProvider {
  async getTopics(): Promise<TopicMeta[]> {
    const topics: TopicMeta[] = [];
    try {
      if (!fs.existsSync(DATA_DIR)) return [];
      
      const topicDirs = fs
        .readdirSync(DATA_DIR, {withFileTypes: true})
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

      for (const dir of topicDirs) {
        const topicPath = path.join(DATA_DIR, dir, 'topic.json');
        if (fs.existsSync(topicPath)) {
          const topicData = JSON.parse(fs.readFileSync(topicPath, 'utf-8'));
          topics.push(topicData);
        }
      }
    } catch (error) {
      console.error('Error reading topics:', error);
    }
    return topics;
  }

  async getTopic(topicId: string): Promise<TopicMeta | null> {
    try {
      const topicPath = path.join(DATA_DIR, topicId, 'topic.json');
      if (fs.existsSync(topicPath)) {
        return JSON.parse(fs.readFileSync(topicPath, 'utf-8'));
      }
    } catch (error) {
      console.error(`Error reading topic ${topicId}:`, error);
    }
    return null;
  }

  async getLessons(topicId: string): Promise<Lesson[]> {
    try {
        // fileUtils has a sync implementation of this logic, but getLessons exported from data.ts was async.
        // Let's reuse the logic from data.ts or fileUtils if available.
        // data.ts had its own getLessons implementation. I'll replicate it here using fs.
        // ACTUALLY, fileUtils does NOT have getLessons. data.ts had it. 
        // I should just copy the logic from data.ts
        const lessons: Lesson[] = [];
        const lessonsDir = path.join(DATA_DIR, topicId, 'lessons');
        if (fs.existsSync(lessonsDir)) {
          const lessonFiles = fs.readdirSync(lessonsDir).filter(file => file.endsWith('.json'));
    
          for (const file of lessonFiles) {
            const lessonPath = path.join(lessonsDir, file);
            const lessonData = JSON.parse(fs.readFileSync(lessonPath, 'utf-8'));
            lessons.push(lessonData);
          }
          // Sort by order
          lessons.sort((a, b) => a.order - b.order);
        }
        return lessons;
    } catch (error) {
         console.error(`Error reading lessons for ${topicId}:`, error);
         return [];
    }
  }

  async getLesson(topicId: string, lessonId: string): Promise<Lesson | null> {
    try {
      const lessonPath = path.join(DATA_DIR, topicId, 'lessons', `${lessonId}.json`);
      if (fs.existsSync(lessonPath)) {
        return JSON.parse(fs.readFileSync(lessonPath, 'utf-8'));
      }
    } catch (error) {
      console.error(`Error reading lesson ${lessonId}:`, error);
    }
    return null;
  }

  async getNotesByTopic(topicId: string): Promise<Note[]> {
    const notes: Note[] = [];
    try {
      const lessons = await this.getLessons(topicId);
      for (const lesson of lessons) {
        const lessonNotes = await this.getNotes(topicId, lesson.id);
        notes.push(...lessonNotes);
      }
      return notes;
    } catch (error) {
      console.error(`Error reading notes for ${topicId}:`, error);
    }
    return [];
  }

  async getNotes(topicId: string, lessonId: string): Promise<Note[]> {
    // fileUtils.getNotes is synchronous
    return getNotes(topicId, lessonId); 
  }

  async saveNote(note: Note, topicId: string): Promise<void> {
    saveNote(note, topicId);
  }

  async deleteNote(noteId: string, lessonId: string, topicId: string): Promise<void> {
    deleteNote(noteId, lessonId, topicId);
  }

  async saveAudioFile(audioBuffer: Buffer, noteId: string, lessonId: string, topicId: string, extension?: string): Promise<string> {
    return saveAudioFile(audioBuffer, noteId, lessonId, topicId, extension);
  }

  async getAudioFile(noteId: string, lessonId: string, topicId: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    try {
        const notesDir = path.join(DATA_DIR, topicId, 'lessons', lessonId, 'notes');
        const audioDir = path.join(notesDir, 'audio');
        const possibleExtensions = ['webm', 'mp3', 'm4a', 'wav', 'mp4'];
        
        let audioPath: string | null = null;
        let contentType = 'audio/mpeg';
    
        for (const ext of possibleExtensions) {
          const testPath = path.join(audioDir, `${noteId}.${ext}`);
          if (fs.existsSync(testPath)) {
            audioPath = testPath;
            contentType =
              ext === 'webm'
                ? 'audio/webm'
                : ext === 'mp3'
                ? 'audio/mpeg'
                : ext === 'm4a'
                ? 'audio/mp4'
                : ext === 'wav'
                ? 'audio/wav'
                : 'audio/mp4';
            break;
          }
        }
    
        if (!audioPath || !fs.existsSync(audioPath)) {
          return null;
        }
    
        const buffer = fs.readFileSync(audioPath);
        return { buffer, contentType };
    } catch (e) {
        console.error('Error reading audio file:', e);
        return null;
    }
  }
  async deleteAudioFile(noteId: string, lessonId: string, topicId: string): Promise<void> {
    const notesDir = path.join(DATA_DIR, topicId, 'lessons', lessonId, 'notes');
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
  }
  async saveLesson(lesson: Lesson, topicId: string): Promise<void> {
    saveLesson(lesson, topicId);
  }

  async deleteLesson(lessonId: string, topicId: string): Promise<void> {
    deleteLesson(lessonId, topicId);
  }

  async updateTopic(topic: TopicMeta): Promise<void> {
    // Adapter for fileUtils.updateTopicMeta which takes (topicId, lessonMetas)
    // We should probably update fileUtils to take full topic or just use what we have.
    // fileUtils.updateTopicMeta only updates lessons and lastUpdated.
    // But the interface says updateTopic(topic).
    // Let's check fileUtils.updateTopicMeta signature: (topicId: string, lessonMetas: LessonMeta[])
    updateTopicMeta(topic.id, topic.lessons);
  }
}
