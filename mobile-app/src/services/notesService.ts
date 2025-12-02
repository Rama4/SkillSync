import AsyncStorage from '@react-native-async-storage/async-storage';
import {Note} from '../types';

class NotesService {
  private getNotesKey(topicId: string, lessonId: string): string {
    return `notes_${topicId}_${lessonId}`;
  }

  async getNotes(topicId: string, lessonId: string): Promise<Note[]> {
    try {
      const key = this.getNotesKey(topicId, lessonId);
      const notesJson = await AsyncStorage.getItem(key);
      
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

  async saveNote(topicId: string, lessonId: string, note: Note): Promise<Note> {
    try {
      const key = this.getNotesKey(topicId, lessonId);
      const existingNotes = await this.getNotes(topicId, lessonId);
      
      // Update existing note or add new one
      const noteIndex = existingNotes.findIndex(n => n.id === note.id);
      if (noteIndex >= 0) {
        existingNotes[noteIndex] = note;
      } else {
        existingNotes.push(note);
      }

      await AsyncStorage.setItem(key, JSON.stringify(existingNotes));
      return note;
    } catch (error) {
      console.error('Error saving note:', error);
      throw error;
    }
  }

  async deleteNote(topicId: string, lessonId: string, noteId: string): Promise<void> {
    try {
      const key = this.getNotesKey(topicId, lessonId);
      const existingNotes = await this.getNotes(topicId, lessonId);
      
      const filteredNotes = existingNotes.filter(note => note.id !== noteId);
      await AsyncStorage.setItem(key, JSON.stringify(filteredNotes));
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }

  async deleteNoteAudio(topicId: string, lessonId: string, noteId: string): Promise<Note | null> {
    try {
      const key = this.getNotesKey(topicId, lessonId);
      const existingNotes = await this.getNotes(topicId, lessonId);
      
      const noteIndex = existingNotes.findIndex(n => n.id === noteId);
      if (noteIndex >= 0) {
        const updatedNote = {
          ...existingNotes[noteIndex],
          audioFile: undefined,
          updatedAt: new Date().toISOString(),
        };
        existingNotes[noteIndex] = updatedNote;
        
        await AsyncStorage.setItem(key, JSON.stringify(existingNotes));
        return updatedNote;
      }
      
      return null;
    } catch (error) {
      console.error('Error deleting note audio:', error);
      throw error;
    }
  }

  async getAllNotes(): Promise<{topicId: string; lessonId: string; notes: Note[]}[]> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const notesKeys = keys.filter(key => key.startsWith('notes_'));
      
      const allNotes = await Promise.all(
        notesKeys.map(async key => {
          const [, topicId, lessonId] = key.split('_');
          const notes = await this.getNotes(topicId, lessonId);
          return {topicId, lessonId, notes};
        })
      );

      return allNotes.filter(item => item.notes.length > 0);
    } catch (error) {
      console.error('Error loading all notes:', error);
      return [];
    }
  }

  async clearAllNotes(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const notesKeys = keys.filter(key => key.startsWith('notes_'));
      await AsyncStorage.multiRemove(notesKeys);
    } catch (error) {
      console.error('Error clearing all notes:', error);
      throw error;
    }
  }
}

export const notesService = new NotesService();
