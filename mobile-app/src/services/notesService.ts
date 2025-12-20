import {createMMKV} from 'react-native-mmkv';
import {Note} from '../../../lib/types';

const storage = createMMKV({
  id: 'notes-storage',
});

class NotesService {
  private getNotesKey(topicId: string, lessonId: string): string {
    return `notes_${topicId}_${lessonId}`;
  }

  getNotes(topicId: string, lessonId: string): Note[] {
    try {
      const key = this.getNotesKey(topicId, lessonId);
      const notesJson = storage.getString(key);

      if (!notesJson) {
        return [];
      }

      const notes: Note[] = JSON.parse(notesJson);
      return notes.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch (error) {
      console.error('Error loading notes:', error);
      return [];
    }
  }

  saveNote(topicId: string, lessonId: string, note: Note): Note {
    try {
      const key = this.getNotesKey(topicId, lessonId);
      const existingNotes = this.getNotes(topicId, lessonId);

      // Update existing note or add new one
      const noteIndex = existingNotes.findIndex(n => n.id === note.id);
      if (noteIndex >= 0) {
        existingNotes[noteIndex] = note;
      } else {
        existingNotes.push(note);
      }

      storage.set(key, JSON.stringify(existingNotes));
      return note;
    } catch (error) {
      console.error('Error saving note:', error);
      throw error;
    }
  }

  deleteNote(topicId: string, lessonId: string, noteId: string): void {
    try {
      const key = this.getNotesKey(topicId, lessonId);
      const existingNotes = this.getNotes(topicId, lessonId);

      const filteredNotes = existingNotes.filter(note => note.id !== noteId);
      storage.set(key, JSON.stringify(filteredNotes));
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }

  deleteNoteAudio(topicId: string, lessonId: string, noteId: string): Note | null {
    try {
      const key = this.getNotesKey(topicId, lessonId);
      const existingNotes = this.getNotes(topicId, lessonId);

      const noteIndex = existingNotes.findIndex(n => n.id === noteId);
      if (noteIndex >= 0) {
        const updatedNote = {
          ...existingNotes[noteIndex],
          audioFile: undefined,
          updatedAt: new Date().toISOString(),
        };
        existingNotes[noteIndex] = updatedNote;

        storage.set(key, JSON.stringify(existingNotes));
        return updatedNote;
      }

      return null;
    } catch (error) {
      console.error('Error deleting note audio:', error);
      throw error;
    }
  }

  getAllNotes(): {topicId: string; lessonId: string; notes: Note[]}[] {
    try {
      const keys = storage.getAllKeys();
      const notesKeys = keys.filter((key: string) => key.startsWith('notes_'));

      const allNotes = notesKeys.map((key: string) => {
        const [, topicId, lessonId] = key.split('_');
        const notes = this.getNotes(topicId, lessonId);
        return {topicId, lessonId, notes};
      });

      return allNotes.filter((item: {topicId: string; lessonId: string; notes: Note[]}) => item.notes.length > 0);
    } catch (error) {
      console.error('Error loading all notes:', error);
      return [];
    }
  }

  clearAllNotes(): void {
    try {
      const keys = storage.getAllKeys();
      const notesKeys = keys.filter((key: string) => key.startsWith('notes_'));
      notesKeys.forEach((key: string) => storage.remove(key));
    } catch (error) {
      console.error('Error clearing all notes:', error);
      throw error;
    }
  }
}

export const notesService = new NotesService();
