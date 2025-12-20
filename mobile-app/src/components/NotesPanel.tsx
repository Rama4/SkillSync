import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert} from 'react-native';
import {Note} from '../../../lib/types';
import {notesService} from '../services/notesService';
import {audioRecorder} from '../native/AudioRecorder';
import NoteItem from './NoteItem';
import NoteEditor from './NoteEditor';

interface NotesPanelProps {
  topicId: string;
  lessonId: string;
  lessonTitle?: string;
}

const NotesPanel: React.FC<NotesPanelProps> = ({topicId, lessonId, lessonTitle = ''}) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [isQuickRecording, setIsQuickRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const loadNotes = async () => {
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
  };

  useEffect(() => {
    loadNotes();
  }, [topicId, lessonId]);

  useEffect(() => {
    if (isQuickRecording) {
      const removeProgressListener = audioRecorder.onRecordingProgress(event => {
        setRecordingDuration(event.duration);
      });

      return () => {
        removeProgressListener();
      };
    }
  }, [isQuickRecording]);

  const generateAudioNoteTitle = useCallback(
    (existingNotes: Note[]): string => {
      const audioNotes = existingNotes.filter(n => n.audioFile);
      const recordingNumber = audioNotes.length + 1;
      return lessonTitle ? `${lessonTitle} ${recordingNumber}` : `Recording ${recordingNumber}`;
    },
    [lessonTitle],
  );

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleQuickRecord = useCallback(async () => {
    try {
      // Generate unique filename for the recording
      const filename = `note_${Date.now()}.m4a`;

      const result = await audioRecorder.startRecording({
        filename,
        sampleRate: 44100,
        bitRate: 128000,
        channels: 1,
      });

      if (result.success) {
        setIsQuickRecording(true);
        setRecordingDuration(0);
      }
    } catch (error: any) {
      console.error('Error starting quick recording:', error);
      Alert.alert(
        'Recording Error',
        error.message || 'Failed to start recording. Please check microphone permissions.',
      );
    }
  }, []);

  const stopQuickRecording = useCallback(async () => {
    if (!isQuickRecording) return;

    try {
      const result = await audioRecorder.stopRecording();

      if (result.success && result.filePath) {
        // Get existing notes to generate title (use current notes state)
        const existingNotes = notesService.getNotes(topicId, lessonId);
        const generatedTitle = generateAudioNoteTitle(existingNotes);

        // Create note object with all required fields
        const newNote: Note = {
          id: `note_${Date.now()}`,
          lessonId,
          title: generatedTitle,
          markdown: '',
          audioFile: result.filePath,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // Save via notesService.saveNote()
        notesService.saveNote(topicId, lessonId, newNote);
        console.log('Quick recorded note saved:', newNote);

        // Refresh notes list
        loadNotes();
      }

      setIsQuickRecording(false);
      setRecordingDuration(0);
    } catch (error: any) {
      console.error('Error stopping quick recording:', error);
      Alert.alert('Error', error.message || 'Failed to stop recording');
      setIsQuickRecording(false);
    }
  }, [isQuickRecording, topicId, lessonId, generateAudioNoteTitle, loadNotes]);

  const handleSave = (note: Note) => {
    setShowEditor(false);
    setEditingNote(null);
    loadNotes();
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setShowEditor(true);
  };

  const handleDelete = async (noteId: string) => {
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
  };

  const handleDeleteAudio = async (noteId: string) => {
    Alert.alert('Delete Audio', 'Are you sure you want to delete the audio recording? The text note will be kept.', [
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
    ]);
  };

  const handleNewNote = () => {
    setEditingNote(null);
    setShowEditor(true);
  };

  if (showEditor) {
    return (
      <NoteEditor
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
            <TouchableOpacity style={styles.stopRecordingButton} onPress={stopQuickRecording}>
              <Text style={styles.stopRecordingButtonText}>⏹ Stop ({formatDuration(recordingDuration)})</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.quickRecordButton} onPress={handleQuickRecord}>
                <Text style={styles.quickRecordButtonText}>🎤 Quick Record</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.newButton} onPress={handleNewNote}>
                <Text style={styles.newButtonText}>+ New Note</Text>
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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
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
  },
  quickRecordButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  stopRecordingButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  stopRecordingButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  newButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  newButtonText: {
    color: '#ffffff',
    fontSize: 14,
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
    fontSize: 16,
    textAlign: 'center',
  },
  notesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
});

export default NotesPanel;
