import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, TextInput} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../../lib/mobile_types';
import {TopicMeta, Lesson, Note} from '../../../lib/types';
import {databaseService} from '@/services/database';
import {createLessonFromNote, saveLessonToFileSystem} from '@/utils/lessonUtils';
import NoteEditor from '@/components/NoteEditor';
import {notesService} from '@/services/notesService';
import AudioPlayer from '@/components/AudioPlayer';
import NotesTreeView from '@/components/NotesTreeView';
import {formatDuration} from '@/utils/noteUtils';
import {useQuickRecord} from '@/hooks/useQuickRecord';
import {createTopicFolderStructure} from '@/utils/topicUtils';
import ArrowRightIcon from '@/assets/icons/arrow-right.svg';
import PlusIcon from '@/assets/icons/plus.svg';

type Props = NativeStackScreenProps<RootStackParamList, 'Topic'>;

const TopicScreen: React.FC<Props> = ({navigation, route}) => {
  const {topicId} = route.params;
  const [topic, setTopic] = useState<TopicMeta | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showNoteEditor, setShowNoteEditor] = useState<boolean>(false);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState<string>('');
  const [lessonNotes, setLessonNotes] = useState<Record<string, Note[]>>({});
  const [viewMode, setViewMode] = useState<'lessons' | 'notes'>('lessons');

  // Use a temporary lessonId for quick recording (will be replaced when lesson is created)
  const tempLessonId = 'temp-lesson-for-recording';

  // quick record hook
  const {
    isRecording: isQuickRecording,
    recordingDuration,
    startRecording,
    stopRecording,
  } = useQuickRecord({
    topicId,
    lessonId: tempLessonId,
    lessonTitle: topic?.title,
    onRecordingComplete: async () => {
      // After recording, get the note and create a lesson from it
      const tempNotes = notesService.getNotes(topicId, tempLessonId);
      if (tempNotes.length > 0) {
        const latestNote = tempNotes[tempNotes.length - 1];
        await handleNoteSaved(latestNote);
        // Clean up the temp note
        await notesService.deleteNote(topicId, tempLessonId, latestNote.id);
      }
    },
  });

  const loadTopicData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load topic metadata
      const topicData = await databaseService.getTopic(topicId);
      if (topicData) {
        setTopic(topicData);
      }

      // Load lessons for this topic
      const lessonsData = await databaseService.getLessonsByTopic(topicId);
      // Sort lessons by order
      lessonsData.sort((a, b) => a.order - b.order);
      setLessons(lessonsData);

      // Load notes for each lesson
      const notesMap: Record<string, Note[]> = {};
      for (const lesson of lessonsData) {
        const notes = notesService.getNotes(topicId, lesson.id);
        notesMap[lesson.id] = notes;
      }
      setLessonNotes(notesMap);
    } catch (error) {
      console.error('Failed to load topic data:', error);
      Alert.alert('Error', 'Failed to load topic data.');
    } finally {
      setIsLoading(false);
    }
  }, [topicId]);

  useEffect(() => {
    loadTopicData();
  }, [topicId, loadTopicData]);

  const navigateToLesson = useCallback(
    (lesson: Lesson) => {
      navigation.navigate('Lesson', {
        lessonId: lesson.id,
        topicId: topicId,
        lessonTitle: lesson.title,
      });
    },
    [navigation, topicId],
  );

  const handleNoteSaved = useCallback(
    async (note: Note) => {
      try {
        // Create lesson from note
        const order = lessons.length + 1;
        const previousLessonId = lessons.length > 0 ? lessons[lessons.length - 1].id : null;
        const newLesson = createLessonFromNote(note, topicId, order, previousLessonId, null);

        // Update previous lesson's nextLesson reference
        if (previousLessonId && lessons.length > 0) {
          const previousLesson = lessons[lessons.length - 1];
          previousLesson.nextLesson = newLesson.id;
          await databaseService.saveLesson(previousLesson);
          // Also save previous lesson to file system
          await saveLessonToFileSystem(previousLesson);
        }

        // Save the new lesson to database
        await databaseService.saveLesson(newLesson);

        // Save the new lesson to file system for persistence
        await saveLessonToFileSystem(newLesson);

        // Update note with real lessonId
        const updatedNote: Note = {
          ...note,
          lessonId: newLesson.id,
        };
        await notesService.saveNote(topicId, newLesson.id, updatedNote);

        // Update topic's lessons array and save to file system
        if (topic) {
          const updatedTopic: TopicMeta = {
            ...topic,
            lessons: [
              ...topic.lessons,
              {
                id: newLesson.id,
                order: newLesson.order,
                title: newLesson.title,
                duration: newLesson.duration,
                difficulty: newLesson.difficulty,
              },
            ],
            lastUpdated: new Date().toISOString().split('T')[0],
          };
          await databaseService.saveTopic(updatedTopic);

          // Save updated topic.json to file system
          await createTopicFolderStructure(updatedTopic);

          // Update state directly instead of reloading everything
          setTopic(updatedTopic);
          setLessons([...lessons, newLesson]);

          // Update lesson notes
          const updatedLessonNotes = {...lessonNotes};
          updatedLessonNotes[newLesson.id] = [updatedNote];
          setLessonNotes(updatedLessonNotes);
        }

        // Close note editor
        setShowNoteEditor(false);

        Alert.alert('Success', `Lesson "${newLesson.title}" created successfully!`);
      } catch (error) {
        console.error('Failed to create lesson from note:', error);
        Alert.alert('Error', 'Failed to create lesson from note');
      }
    },
    [lessonNotes, lessons, topic, topicId],
  );

  const handleStartEditingTitle = useCallback((lesson: Lesson) => {
    setEditingLessonId(lesson.id);
    setEditingTitle(lesson.title);
  }, []);

  const handleSaveTitle = useCallback(
    async (lessonId: string) => {
      const trimmedTitle = editingTitle.trim();
      if (!trimmedTitle) {
        Alert.alert('Error', 'Lesson title cannot be empty');
        return;
      }

      try {
        const lesson = lessons.find(l => l.id === lessonId);
        if (!lesson) {
          Alert.alert('Error', 'Lesson not found');
          return;
        }

        // Update lesson title
        const updatedLesson: Lesson = {
          ...lesson,
          title: trimmedTitle,
          lastUpdated: new Date().toISOString().split('T')[0],
        };
        await databaseService.saveLesson(updatedLesson);

        // Update topic's lesson metadata
        if (topic) {
          const updatedLessons = topic.lessons.map(l =>
            l.id === lessonId
              ? {
                  ...l,
                  title: trimmedTitle,
                }
              : l,
          );
          const updatedTopic: TopicMeta = {
            ...topic,
            lessons: updatedLessons,
            lastUpdated: new Date().toISOString().split('T')[0],
          };
          await databaseService.saveTopic(updatedTopic);
          setTopic(updatedTopic);
        }

        // Refresh lessons list
        await loadTopicData();

        // Reset editing state
        setEditingLessonId(null);
        setEditingTitle('');
      } catch (error) {
        console.error('Failed to update lesson title:', error);
        Alert.alert('Error', 'Failed to update lesson title');
      }
    },
    [editingTitle, lessons, loadTopicData, topic],
  );

  const handleCancelEditing = useCallback(() => {
    setEditingLessonId(null);
    setEditingTitle('');
  }, []);

  // Check if lesson has empty content
  const isLessonEmpty = useCallback((lesson: Lesson): boolean => {
    return (
      !lesson.sections ||
      lesson.sections.length === 0 ||
      lesson.sections.every(section => !section.content || section.content.trim() === '')
    );
  }, []);

  // Get first audio note for a lesson
  const getFirstAudioNote = useCallback(
    (lessonId: string): Note | null => {
      const notes = lessonNotes[lessonId] || [];
      return notes.find(note => note.audioFile) || null;
    },
    [lessonNotes],
  );

  if (showNoteEditor) {
    return (
      <NoteEditor
        topicId={topicId}
        onSave={handleNoteSaved}
        onCancel={() => setShowNoteEditor(false)}
        onCreateLesson={handleNoteSaved}
      />
    );
  }

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading lessons...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with View Toggle and Action Buttons */}
      <View style={styles.header}>
        {/* Top Row: Title and Action Buttons */}
        <View style={styles.headerTopRow}>
          {lessons && lessons.length > 0 && (
            <Text style={styles.sectionTitle}>{viewMode === 'lessons' ? `Lessons (${lessons.length})` : 'Notes'}</Text>
          )}
          <View style={styles.headerActions}>
            {isQuickRecording ? (
              <TouchableOpacity style={styles.stopRecordingButton} onPress={stopRecording}>
                <Text style={styles.stopRecordingButtonText}>⏹ {formatDuration(recordingDuration)}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.quickRecordButton} onPress={startRecording}>
                <Text style={styles.quickRecordButtonText}>🎤</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.newNoteButton} onPress={() => setShowNoteEditor(true)}>
              <PlusIcon color="white" width={16} height={16} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Row: View Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === 'lessons' && styles.viewToggleButtonActive]}
            onPress={() => setViewMode('lessons')}>
            <Text style={[styles.viewToggleText, viewMode === 'lessons' && styles.viewToggleTextActive]}>Lessons</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewToggleButton, viewMode === 'notes' && styles.viewToggleButtonActive]}
            onPress={() => setViewMode('notes')}>
            <Text style={[styles.viewToggleText, viewMode === 'notes' && styles.viewToggleTextActive]}>Notes</Text>
          </TouchableOpacity>
        </View>
      </View>

      {viewMode === 'notes' ? (
        <NotesTreeView topicId={topicId} />
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
          {/* Lessons List */}
          {lessons.length > 0 && (
            <View>
              {lessons.map((lesson, index) => {
                const isEmpty = isLessonEmpty(lesson);
                const audioNote = isEmpty ? getFirstAudioNote(lesson.id) : null;

                return (
                  <TouchableOpacity
                    key={lesson.id}
                    style={styles.lessonCard}
                    onPress={() => navigateToLesson(lesson)}
                    onLongPress={() => handleStartEditingTitle(lesson)}>
                    <View style={styles.lessonHeader}>
                      <View style={styles.lessonNumber}>
                        <Text style={styles.lessonNumberText}>{index + 1}</Text>
                      </View>
                      <View style={styles.lessonInfo}>
                        {editingLessonId === lesson.id ? (
                          <View style={styles.titleEditContainer}>
                            <TextInput
                              style={styles.titleInput}
                              value={editingTitle}
                              onChangeText={setEditingTitle}
                              autoFocus
                              onSubmitEditing={() => handleSaveTitle(lesson.id)}
                            />
                            <TouchableOpacity style={styles.saveTitleButton} onPress={() => handleSaveTitle(lesson.id)}>
                              <Text style={styles.saveTitleButtonText}>✓</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.cancelTitleButton} onPress={handleCancelEditing}>
                              <Text style={styles.cancelTitleButtonText}>✕</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <>
                            <Text style={styles.lessonTitle}>{lesson.title}</Text>
                            {audioNote && (
                              <View style={styles.audioPlayerContainer}>
                                <AudioPlayer
                                  filePath={audioNote.audioFile!}
                                  onError={error => {
                                    console.error('Audio player error:', error);
                                    Alert.alert('Playback Error', error);
                                  }}
                                  style={styles.audioPlayer}
                                />
                              </View>
                            )}
                          </>
                        )}
                      </View>
                    </View>
                    <ArrowRightIcon color="white" width={18} height={18} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Empty State */}
          {lessons.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No Lessons Available</Text>
              <Text style={styles.emptyStateText}>
                No lessons found for this topic. The content might not be downloaded yet.
              </Text>
            </View>
          )}
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
  centerContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 30,
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333333',
  },
  topicIcon: {
    fontSize: 48,
    marginRight: 16,
  },
  topicInfo: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  topicDescription: {
    fontSize: 16,
    color: '#a1a1aa',
    lineHeight: 22,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#333333',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  tagText: {
    fontSize: 12,
    color: '#a1a1aa',
    fontWeight: '500',
  },
  lessonCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
    flexDirection: 'row',
    alignItems: 'center',
  },
  lessonHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  lessonNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  lessonNumberText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  lessonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  duration: {
    fontSize: 14,
    color: '#a1a1aa',
    marginRight: 16,
  },
  difficulty: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  difficultyIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  objectives: {
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 18,
  },
  loadingText: {
    color: '#a1a1aa',
    fontSize: 16,
    marginTop: 16,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#a1a1aa',
    textAlign: 'center',
    lineHeight: 22,
  },
  header: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    gap: 12,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#0a0a0a',
    borderRadius: 8,
    padding: 3,
    alignSelf: 'flex-start',
  },
  viewToggleButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  viewToggleButtonActive: {
    backgroundColor: '#8b5cf6',
  },
  viewToggleText: {
    color: '#a1a1aa',
    fontSize: 14,
    fontWeight: '500',
  },
  viewToggleTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  quickRecordButton: {
    width: 40,
    height: 40,
    backgroundColor: '#8b5cf6',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRecordButtonText: {
    fontSize: 18,
  },
  stopRecordingButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stopRecordingButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  newNoteButton: {
    width: 40,
    height: 40,
    backgroundColor: '#8b5cf6',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  titleInput: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#8b5cf6',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 16,
    color: 'white',
  },
  saveTitleButton: {
    backgroundColor: '#10b981',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  saveTitleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelTitleButton: {
    backgroundColor: '#ef4444',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cancelTitleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  audioPlayerContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  audioPlayer: {
    marginTop: 0,
  },
});

export default TopicScreen;
