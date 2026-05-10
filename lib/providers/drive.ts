import { IDataProvider } from '../dataProvider';
import { TopicMeta, Lesson, Note, NotesIndex } from '../types';
import { driveService, DriveFile } from '../drive';
import { Readable } from 'stream';

export class GoogleDriveProvider implements IDataProvider {
  private dataFolderId: string;

  constructor() {
    const folderId = process.env.GOOGLE_DRIVE_DATA_FOLDER_ID;
    if (!folderId) {
      throw new Error('GOOGLE_DRIVE_DATA_FOLDER_ID is not set');
    }
    this.dataFolderId = folderId;
  }

  // Helper to traverse path: root -> folder1 -> folder2
  private async resolvePath(parts: string[]): Promise<DriveFile | null> {
    let currentId = this.dataFolderId;
    let currentFile: DriveFile | null = null;
    
    for (const part of parts) {
      if (!currentId) return null;
      currentFile = await driveService.findFileByName(part, currentId);
      if (!currentFile) return null;
      currentId = currentFile.id;
    }
    return currentFile;
  }

  async getTopics(): Promise<TopicMeta[]> {
    const topics: TopicMeta[] = [];
    try {
      // List folders in root
      const children = await driveService.listChildren(this.dataFolderId);
      const startFolders = children.filter(f => f.mimeType === 'application/vnd.google-apps.folder');

      for (const folder of startFolders) {
        // Look for topic.json in each folder
        const topicIdx = await driveService.findFileByName('topic.json', folder.id);
        if (topicIdx) {
          try {
             const content = await driveService.getFileContent(topicIdx.id);
             topics.push(JSON.parse(content));
          } catch(e) {
             console.error(`Error parsing topic.json in ${folder.name}`, e);
          }
        }
      }
    } catch (error) {
      console.error('Error reading topics from Drive:', error);
    }
    return topics;
  }

  async getTopic(topicId: string): Promise<TopicMeta | null> {
    try {
      const topicFolder = await driveService.findFileByName(topicId, this.dataFolderId);
      if (!topicFolder) return null;

      const topicJson = await driveService.findFileByName('topic.json', topicFolder.id);
      if (topicJson) {
        const content = await driveService.getFileContent(topicJson.id);
        return JSON.parse(content);
      }
    } catch (error) {
      console.error(`Error reading topic ${topicId}:`, error);
    }
    return null;
  }

  async getLessons(topicId: string): Promise<Lesson[]> {
    const lessons: Lesson[] = [];
    try {
      const topicFolder = await driveService.findFileByName(topicId, this.dataFolderId);
      if (!topicFolder) return [];

      const lessonsFolder = await driveService.findFileByName('lessons', topicFolder.id);
      if (!lessonsFolder) return [];

      const files = await driveService.listChildren(lessonsFolder.id);
      const jsonFiles = files.filter(f => f.name.endsWith('.json') && f.mimeType !== 'application/vnd.google-apps.folder');

      for (const file of jsonFiles) {
        const content = await driveService.getFileContent(file.id);
        lessons.push(JSON.parse(content));
      }
      
      lessons.sort((a, b) => a.order - b.order);
    } catch (error) {
       console.error(`Error getting lessons for ${topicId}:`, error);
    }
    return lessons;
  }

  async getLesson(topicId: string, lessonId: string): Promise<Lesson | null> {
      try {
        const topicFolder = await driveService.findFileByName(topicId, this.dataFolderId);
        if (!topicFolder) return null;

        const lessonsFolder = await driveService.findFileByName('lessons', topicFolder.id);
        if (!lessonsFolder) return null;

        // Try exact name first "lessonId.json"
        const file = await driveService.findFileByName(`${lessonId}.json`, lessonsFolder.id);
        if (file) {
             const content = await driveService.getFileContent(file.id);
             return JSON.parse(content);
        }
      } catch (e) {
         console.error(`Error getting lesson ${lessonId}:`, e);
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
     } catch (e) {
        console.error(`Error getting notes for topic ${topicId}:`, e);
     }
     return notes;
  }

  async getNotes(topicId: string, lessonId: string): Promise<Note[]> {
    try {
        console.log(`[getNotes] Starting: topicId=${topicId}, lessonId=${lessonId}`);
        
        const topicFolder = await driveService.findFileByName(topicId, this.dataFolderId);
        if (!topicFolder) {
            console.log(`[getNotes] Topic folder not found: ${topicId}`);
            return [];
        }
        console.log(`[getNotes] Found topic folder: ${topicFolder.name} (${topicFolder.id})`);

        const lessonsFolder = await driveService.findFileByName('lessons', topicFolder.id);
        if (!lessonsFolder) {
            console.log(`[getNotes] Lessons folder not found in topic: ${topicId}`);
            return [];
        }
        console.log(`[getNotes] Found lessons folder: ${lessonsFolder.id}`);
        
        const validLessonFolder = await driveService.findFileByName(lessonId, lessonsFolder.id);
        if (!validLessonFolder) {
            console.log(`[getNotes] Lesson folder not found: ${lessonId} in lessons/`);
            // List children to debug
            const children = await driveService.listChildren(lessonsFolder.id);
            console.log(`[getNotes] Available items in lessons/:`, children.map(f => `${f.name} (${f.mimeType})`));
            return [];
        }
        console.log(`[getNotes] Found lesson folder: ${validLessonFolder.name} (${validLessonFolder.id})`);

        const notesFolder = await driveService.findFileByName('notes', validLessonFolder.id);
        if (!notesFolder) {
            console.log(`[getNotes] Notes folder not found in lesson: ${lessonId}`);
            return [];
        }
        console.log(`[getNotes] Found notes folder: ${notesFolder.id}`);

        const indexFile = await driveService.findFileByName('notes.json', notesFolder.id);
        if (!indexFile) {
            console.log(`[getNotes] notes.json index not found in notes folder`);
            return [];
        }
        console.log(`[getNotes] Found notes.json index`);

        const indexContent = await driveService.getFileContent(indexFile.id);
        const index: NotesIndex = JSON.parse(indexContent);
        console.log(`[getNotes] Index contains ${index.notes.length} note IDs:`, index.notes);
        
        const notes: Note[] = [];
        for (const noteId of index.notes) {
            const noteFile = await driveService.findFileByName(`${noteId}.json`, notesFolder.id);
            if (noteFile) {
                const noteContent = await driveService.getFileContent(noteFile.id);
                notes.push(JSON.parse(noteContent));
                console.log(`[getNotes] Loaded note: ${noteId}`);
            } else {
                console.log(`[getNotes] Note file not found: ${noteId}.json`);
            }
        }
        
        notes.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        console.log(`[getNotes] Returning ${notes.length} notes`);
        return notes;

    } catch (e) {
        console.error(`[getNotes] Error getting notes for lesson ${lessonId}:`, e);
    }
    return [];
  }

  async saveNote(note: Note, topicId: string): Promise<void> {
      try {
         const topicFolder = await this.ensureFolder(topicId, this.dataFolderId);
         const lessonsFolder = await this.ensureFolder('lessons', topicFolder.id);
         const lessonIdFolder = await this.ensureFolder(note.lessonId, lessonsFolder.id);
         const notesFolder = await this.ensureFolder('notes', lessonIdFolder.id);
         // Ensure audio folder exists too just in case
         await this.ensureFolder('audio', notesFolder.id);

         // Handle Index
         let index: NotesIndex = { notes: [], lastUpdated: new Date().toISOString() };
         const indexFile = await driveService.findFileByName('notes.json', notesFolder.id);
         
         if (indexFile) {
             const content = await driveService.getFileContent(indexFile.id);
             index = JSON.parse(content);
         }
         
         if (!index.notes.includes(note.id)) {
             index.notes.push(note.id);
         }
         index.lastUpdated = new Date().toISOString();
         note.updatedAt = new Date().toISOString();
         if (!note.createdAt) note.createdAt = note.updatedAt;

         // Write Note
         await driveService.uploadFile(`${note.id}.json`, notesFolder.id, JSON.stringify(note, null, 2), 'application/json');
         
         // Write Index
         await driveService.uploadFile('notes.json', notesFolder.id, JSON.stringify(index, null, 2), 'application/json');

      } catch (e) {
          console.error('Error saving note to Drive:', e);
          throw e;
      }
  }

  async deleteNote(noteId: string, lessonId: string, topicId: string): Promise<void> {
      try {
          const topicFolder = await driveService.findFileByName(topicId, this.dataFolderId);
          if (!topicFolder) return;

          const lessonsFolder = await driveService.findFileByName('lessons', topicFolder.id);
          if (!lessonsFolder) return;

          const lessonIdFolder = await driveService.findFileByName(lessonId, lessonsFolder.id);
          if (!lessonIdFolder) return;

          const notesFolder = await driveService.findFileByName('notes', lessonIdFolder.id);
          if (!notesFolder) return;

          // Delete note file
          const noteFile = await driveService.findFileByName(`${noteId}.json`, notesFolder.id);
          if (noteFile) {
              await driveService.deleteFile(noteFile.id);
          }

          // Update index
          const indexFile = await driveService.findFileByName('notes.json', notesFolder.id);
          if (indexFile) {
              const content = await driveService.getFileContent(indexFile.id);
              const index: NotesIndex = JSON.parse(content);
              
              if (index.notes.includes(noteId)) {
                  index.notes = index.notes.filter(id => id !== noteId);
                  index.lastUpdated = new Date().toISOString();
                  await driveService.uploadFile('notes.json', notesFolder.id, JSON.stringify(index, null, 2), 'application/json');
              }
          }

          // TODO: Delete audio implementation (optional for now as per previous context, but good to have)
          
      } catch (e) {
          console.error('Error deleting note from Drive:', e);
          throw e;
      }
  }

  async saveAudioFile(audioBuffer: Buffer, noteId: string, lessonId: string, topicId: string, extension: string = 'webm'): Promise<string> {
      try {
          const topicFolder = await this.ensureFolder(topicId, this.dataFolderId);
          const lessonsFolder = await this.ensureFolder('lessons', topicFolder.id);
          const lessonIdFolder = await this.ensureFolder(lessonId, lessonsFolder.id);
          const notesFolder = await this.ensureFolder('notes', lessonIdFolder.id);
          const audioFolder = await this.ensureFolder('audio', notesFolder.id);

          const stream = Readable.from(audioBuffer);
          const mimeType = extension === 'mp3' ? 'audio/mpeg' : 'audio/webm'; // Basic mapping
          
          await driveService.uploadStream(`${noteId}.${extension}`, audioFolder.id, stream, mimeType);
          return `audio/${noteId}.${extension}`;
      } catch (e) {
          console.error('Error saving audio file to Drive:', e);
          throw e;
      }
  }

  async getAudioFile(noteId: string, lessonId: string, topicId: string): Promise<{ buffer: Buffer; contentType: string } | null> {
      try {
        const topicFolder = await driveService.findFileByName(topicId, this.dataFolderId);
        if (!topicFolder) return null;

        const lessonsFolder = await driveService.findFileByName('lessons', topicFolder.id);
        if (!lessonsFolder) return null;

        const validLessonFolder = await driveService.findFileByName(lessonId, lessonsFolder.id);
        if (!validLessonFolder) return null;

        const notesFolder = await driveService.findFileByName('notes', validLessonFolder.id);
        if (!notesFolder) return null;
        
        const audioFolder = await driveService.findFileByName('audio', notesFolder.id);
        if (!audioFolder) return null;

        // Search for file starting with noteId
        const files = await driveService.listChildren(audioFolder.id);
        const audioFile = files.find(f => f.name.startsWith(noteId + '.'));
        
        if (!audioFile) return null;
        
        const buffer = await driveService.getFileBuffer(audioFile.id);
        
        let contentType = 'audio/mpeg';
        if (audioFile.name.endsWith('.webm')) contentType = 'audio/webm';
        else if (audioFile.name.endsWith('.mp4')) contentType = 'audio/mp4';
        else if (audioFile.name.endsWith('.wav')) contentType = 'audio/wav';
        else if (audioFile.name.endsWith('.m4a')) contentType = 'audio/mp4';

        return { buffer, contentType };

      } catch (e) {
          console.error(`Error getting audio for note ${noteId}:`, e);
          return null;
      }
  }

  async deleteAudioFile(noteId: string, lessonId: string, topicId: string): Promise<void> {
      try {
          const topicFolder = await driveService.findFileByName(topicId, this.dataFolderId);
          if (!topicFolder) return;

          const lessonsFolder = await driveService.findFileByName('lessons', topicFolder.id);
          if (!lessonsFolder) return;

          const lessonIdFolder = await driveService.findFileByName(lessonId, lessonsFolder.id);
          if (!lessonIdFolder) return;

          const notesFolder = await driveService.findFileByName('notes', lessonIdFolder.id);
          if (!notesFolder) return;

          const audioFolder = await driveService.findFileByName('audio', notesFolder.id);
          if (!audioFolder) return;

          const files = await driveService.listChildren(audioFolder.id);
          const audioFile = files.find(f => f.name.startsWith(noteId + '.'));
          
          if (audioFile) {
              await driveService.deleteFile(audioFile.id);
          }
      } catch (e) {
          console.error('Error deleting audio file from Drive:', e);
      }
  }

  async saveLesson(lesson: Lesson, topicId: string): Promise<void> {
      try {
          const topicFolder = await this.ensureFolder(topicId, this.dataFolderId);
          const lessonsFolder = await this.ensureFolder('lessons', topicFolder.id);
          
          lesson.lastUpdated = new Date().toISOString().split('T')[0];
          
          await driveService.uploadFile(`${lesson.id}.json`, lessonsFolder.id, JSON.stringify(lesson, null, 2), 'application/json');
      } catch (e) {
          console.error('Error saving lesson to Drive:', e);
          throw e;
      }
  }

  async deleteLesson(lessonId: string, topicId: string): Promise<void> {
      try {
          const topicFolder = await driveService.findFileByName(topicId, this.dataFolderId);
          if (!topicFolder) return;

          const lessonsFolder = await driveService.findFileByName('lessons', topicFolder.id);
          if (!lessonsFolder) return;

          // Delete lesson.json
          const lessonFile = await driveService.findFileByName(`${lessonId}.json`, lessonsFolder.id);
          if (lessonFile) {
              await driveService.deleteFile(lessonFile.id);
          }

          // Delete notes folder (named lessonId)
          const notesFolder = await driveService.findFileByName(lessonId, lessonsFolder.id);
          if (notesFolder) {
              await driveService.deleteFile(notesFolder.id);
          }
      } catch (e) {
          console.error('Error deleting lesson from Drive:', e);
      }
  }

  async updateTopic(topic: TopicMeta): Promise<void> {
      try {
          const topicFolder = await driveService.findFileByName(topic.id, this.dataFolderId);
          if (!topicFolder) {
              console.error(`Topic folder ${topic.id} not found for update.`);
              return;
          }

          topic.lastUpdated = new Date().toISOString().split('T')[0];
          
          // Overwrite topic.json
          await driveService.uploadFile('topic.json', topicFolder.id, JSON.stringify(topic, null, 2), 'application/json');
      } catch (e) {
          console.error('Error updating topic on Drive:', e);
          throw e;
      }
  }

  // Helper to get or create folder
  private async ensureFolder(name: string, parentId: string): Promise<DriveFile> {
      return await driveService.createFolder(name, parentId);
  }
}
