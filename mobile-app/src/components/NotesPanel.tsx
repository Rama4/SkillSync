import React, {useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle} from 'react';
import {View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert} from 'react-native';
import {Note} from '../../../lib/types';
import {notesService} from '@/services/notesService';
import NoteItem from '@/components/NoteItem';
import NoteEditor, {NoteEditorHandle} from './NoteEditor';
import {formatDuration} from '@/utils/noteUtils';
import {useQuickRecord} from '@/hooks/useQuickRecord';
import PlusIcon from '@/assets/icons/plus.svg';

export interface NotesPanelHandle {
  saveCurrentNote: () => Promise<void>;
}

interface NotesPanelProps {
  topicId: string;
  lessonId: string;
  lessonTitle?: string;
  onEditorStateChange?: (isEditing: boolean) => void;
}

const NotesPanel = forwardRef<NotesPanelHandle, NotesPanelProps>(
  ({topicId, lessonId, lessonTitle = '', onEditorStateChange}, ref) => {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [editingNote, setEditingNote] = useState<Note | null>(null);
    const [showEditor, setShowEditor] = useState<boolean>(false);

    // Ref for the NoteEditor
    const noteEditorRef = useRef<NoteEditorHandle>(null);

    const loadNotes = useCallback(async () => {
      setLoading(true);
      try {
        const loadedNotes = await notesService.getNotes(topicId, lessonId);
        setNotes(loadedNotes);
      } catch (error) {
        console.error('Error loading notes:', error);
        Alert.alert('Error', 'Failed to load notes');
      } finally {
        setLoading(false);
      }
    }, [topicId, lessonId]);

    // Use the quick record hook
    const {
      isRecording: isQuickRecording,
      recordingDuration,
      startRecording,
      stopRecording,
    } = useQuickRecord({
      topicId,
      lessonId,
      lessonTitle,
      onRecordingComplete: loadNotes,
    });

    // Expose save functionality to parent
    useImperativeHandle(ref, () => ({
      saveCurrentNote: async () => {
        if (showEditor && noteEditorRef.current) {
          await noteEditorRef.current.saveNote();
        }
      },
    }));

    // Notify parent about editor state changes
    useEffect(() => {
      onEditorStateChange?.(showEditor);
    }, [showEditor, onEditorStateChange]);

    useEffect(() => {
      loadNotes();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [topicId, lessonId]);

    const handleSave = useCallback(() => {
      setShowEditor(false);
      setEditingNote(null);
      loadNotes();
    }, [loadNotes]);

    const handleEdit = useCallback((note: Note) => {
      setEditingNote(note);
      setShowEditor(true);
    }, []);

    const handleDelete = useCallback(
      async (noteId: string) => {
        Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await notesService.deleteNote(topicId, lessonId, noteId);
                loadNotes();
              } catch (error) {
                console.error('Error deleting note:', error);
                Alert.alert('Error', 'Failed to delete note');
              }
            },
          },
        ]);
      },
      [topicId, lessonId, loadNotes],
    );

    const handleDeleteAudio = useCallback(
      async (noteId: string) => {
        Alert.alert(
          'Delete Audio',
          'Are you sure you want to delete the audio recording? The text note will be kept.',
          [
            {text: 'Cancel', style: 'cancel'},
            {
              text: 'Delete Audio',
              style: 'destructive',
              onPress: async () => {
                try {
                  await notesService.deleteNoteAudio(topicId, lessonId, noteId);
                  loadNotes();
                } catch (error) {
                  console.error('Error deleting audio:', error);
                  Alert.alert('Error', 'Failed to delete audio');
                }
              },
            },
          ],
        );
      },
      [topicId, lessonId, loadNotes],
    );

    const handleNewNote = useCallback(() => {
      setEditingNote(null);
      setShowEditor(true);
    }, []);

    if (showEditor) {
      return (
        <NoteEditor
          ref={noteEditorRef}
          note={editingNote}
          topicId={topicId}
          lessonId={lessonId}
          lessonTitle={lessonTitle}
          onSave={handleSave}
          onCancel={() => {
            setShowEditor(false);
            setEditingNote(null);
          }}
        />
      );
    }

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Notes</Text>
          <View style={styles.headerButtons}>
            {isQuickRecording ? (
              <TouchableOpacity style={styles.stopRecordingButton} onPress={stopRecording}>
                <Text style={styles.stopRecordingButtonText}>⏹ Stop ({formatDuration(recordingDuration)})</Text>
              </TouchableOpacity>
            ) : (
              <>
                <TouchableOpacity style={styles.quickRecordButton} onPress={startRecording}>
                  <Text style={styles.quickRecordButtonText}>🎤 Quick Record</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.newButton} onPress={handleNewNote}>
                  <PlusIcon color="white" width={14} height={14} />
                  <Text style={styles.newButtonText}>New Note</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#8b5cf6" />
          </View>
        ) : notes.length === 0 ? (
          <View style={styles.centerContainer}>
            <Text style={styles.emptyText}>No notes yet. Create your first note!</Text>
          </View>
        ) : (
          <ScrollView style={styles.notesList} showsVerticalScrollIndicator={false}>
            {notes.map(note => (
              <NoteItem
                key={note.id}
                note={note}
                topicId={topicId}
                lessonId={lessonId}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onDeleteAudio={handleDeleteAudio}
              />
            ))}
          </ScrollView>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    backgroundColor: '#1a1a1a',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  quickRecordButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quickRecordButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
  },
  stopRecordingButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  stopRecordingButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  newButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  newButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#a1a1aa',
    fontSize: 14,
    textAlign: 'center',
  },
  notesList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});

export default NotesPanel;
