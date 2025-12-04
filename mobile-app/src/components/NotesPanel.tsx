import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {Note} from '../../../lib/types';
import {notesService} from '../services/notesService';
import NoteItem from './NoteItem';
import NoteEditor from './NoteEditor';

interface NotesPanelProps {
  topicId: string;
  lessonId: string;
}

const NotesPanel: React.FC<NotesPanelProps> = ({topicId, lessonId}) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showEditor, setShowEditor] = useState(false);

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
        <TouchableOpacity style={styles.newButton} onPress={handleNewNote}>
          <Text style={styles.newButtonText}>+ New Note</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8b5cf6" />
        </View>
      ) : notes.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>
            No notes yet. Create your first note!
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.notesList}
          showsVerticalScrollIndicator={false}>
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
