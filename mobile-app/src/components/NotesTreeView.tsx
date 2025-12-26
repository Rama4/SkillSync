import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert} from 'react-native';
import {Lesson, Note} from '../../../lib/types';
import {databaseService} from '@/services/database';
import {notesService} from '@/services/notesService';
import NoteItem from '@/components/NoteItem';
import NoteEditor from '@/components/NoteEditor';

interface NotesTreeViewProps {
  topicId: string;
}

const NotesTreeView: React.FC<NotesTreeViewProps> = ({topicId}) => {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonNotes, setLessonNotes] = useState<Record<string, Note[]>>({});
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<boolean>(true);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showEditor, setShowEditor] = useState<boolean>(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [topicId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load lessons for this topic
      const lessonsData = await databaseService.getLessonsByTopic(topicId);
      // Sort lessons by order
      lessonsData.sort((a, b) => a.order - b.order);
      setLessons(lessonsData);

      // Load notes for each lesson
      const notesMap: Record<string, Note[]> = {};
      for (const lesson of lessonsData) {
        const notes = notesService.getNotes(topicId, lesson.id);
        if (notes.length > 0) {
          notesMap[lesson.id] = notes;
        }
      }
      setLessonNotes(notesMap);
    } catch (error) {
      console.error('Failed to load notes tree data:', error);
      Alert.alert('Error', 'Failed to load notes.');
    } finally {
      setLoading(false);
    }
  };

  const toggleLesson = (lessonId: string) => {
    const newExpanded = new Set(expandedLessons);
    if (newExpanded.has(lessonId)) {
      newExpanded.delete(lessonId);
    } else {
      newExpanded.add(lessonId);
    }
    setExpandedLessons(newExpanded);
  };

  const handleEdit = (note: Note, lessonId: string) => {
    setEditingNote(note);
    setEditingLessonId(lessonId);
    setShowEditor(true);
  };

  const handleDelete = async (noteId: string, lessonId: string) => {
    Alert.alert('Delete Note', 'Are you sure you want to delete this note?', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await notesService.deleteNote(topicId, lessonId, noteId);
            loadData(); // Reload data after deletion
          } catch (error) {
            console.error('Error deleting note:', error);
            Alert.alert('Error', 'Failed to delete note');
          }
        },
      },
    ]);
  };

  const handleDeleteAudio = async (noteId: string, lessonId: string) => {
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
              loadData(); // Reload data after deletion
            } catch (error) {
              console.error('Error deleting audio:', error);
              Alert.alert('Error', 'Failed to delete audio');
            }
          },
        },
      ],
    );
  };

  const handleSave = () => {
    setShowEditor(false);
    setEditingNote(null);
    setEditingLessonId(null);
    loadData(); // Reload data after saving
  };

  if (showEditor && editingNote && editingLessonId) {
    return (
      <NoteEditor
        note={editingNote}
        topicId={topicId}
        lessonId={editingLessonId}
        lessonTitle={lessons.find(l => l.id === editingLessonId)?.title || ''}
        onSave={handleSave}
        onCancel={() => {
          setShowEditor(false);
          setEditingNote(null);
          setEditingLessonId(null);
        }}
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading notes...</Text>
      </View>
    );
  }

  // Filter lessons that have notes
  const lessonsWithNotes = lessons.filter(lesson => {
    const notes = lessonNotes[lesson.id] || [];
    return notes.length > 0;
  });

  if (lessonsWithNotes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No notes found for any lessons.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {lessonsWithNotes.map((lesson, index) => {
        const notes = lessonNotes[lesson.id] || [];
        const isExpanded = expandedLessons.has(lesson.id);

        return (
          <View key={lesson.id} style={styles.lessonGroup}>
            <TouchableOpacity
              style={styles.lessonHeader}
              onPress={() => toggleLesson(lesson.id)}
              activeOpacity={0.7}>
              <View style={styles.lessonHeaderLeft}>
                <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                <View style={styles.lessonNumber}>
                  <Text style={styles.lessonNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.lessonInfo}>
                  <Text style={styles.lessonTitle}>{lesson.title}</Text>
                  <Text style={styles.noteCount}>{notes.length} note{notes.length !== 1 ? 's' : ''}</Text>
                </View>
              </View>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.notesContainer}>
                {notes.map(note => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    topicId={topicId}
                    lessonId={lesson.id}
                    onEdit={() => handleEdit(note, lesson.id)}
                    onDelete={() => handleDelete(note.id, lesson.id)}
                    onDeleteAudio={() => handleDeleteAudio(note.id, lesson.id)}
                  />
                ))}
              </View>
            )}
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  loadingText: {
    color: '#a1a1aa',
    fontSize: 16,
    marginTop: 16,
  },
  emptyText: {
    color: '#a1a1aa',
    fontSize: 14,
    textAlign: 'center',
  },
  lessonGroup: {
    marginBottom: 16,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333333',
    overflow: 'hidden',
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#1a1a1a',
  },
  lessonHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  expandIcon: {
    fontSize: 14,
    color: '#8b5cf6',
    width: 20,
    textAlign: 'center',
  },
  lessonNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lessonNumberText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  noteCount: {
    fontSize: 12,
    color: '#a1a1aa',
  },
  notesContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
});

export default NotesTreeView;

