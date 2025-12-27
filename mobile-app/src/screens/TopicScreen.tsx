import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, TextInput} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList} from '../../../lib/mobile_types';
import {TopicMeta, Lesson, Note} from '../../../lib/types';
import {databaseService} from '@/services/database';
import {createLessonFromNote, saveLessonToFileSystem, deleteLessonFromFileSystem} from '@/utils/lessonUtils';
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
  const [editingTitles, setEditingTitles] = useState<Record<string, string>>({});
  const [lessonNotes, setLessonNotes] = useState<Record<string, Note[]>>({});
  const [viewMode, setViewMode] = useState<'lessons' | 'notes'>('lessons');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

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

  // Refresh data when screen comes back into focus (e.g., after editing a lesson)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadTopicData();
    });

    return unsubscribe;
  }, [navigation, loadTopicData]);

  // Update navigation header when topic title changes
  useEffect(() => {
    if (topic) {
      navigation.setOptions({
        title: topic.title,
      });
    }
  }, [topic, navigation]);

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

  const handleToggleEditMode = useCallback(() => {
    if (isEditMode) {
      // Exiting edit mode - cancel all edits
      setEditingTitles({});
    } else {
      // Entering edit mode - initialize editing titles
      const initialTitles: Record<string, string> = {};
      lessons.forEach(lesson => {
        initialTitles[lesson.id] = lesson.title;
      });
      setEditingTitles(initialTitles);
    }
    setIsEditMode(!isEditMode);
  }, [isEditMode, lessons]);

  const handleSaveAllChanges = useCallback(async () => {
    try {
      let hasChanges = false;

      // Save all lesson title changes
      for (const lesson of lessons) {
        const newTitle = editingTitles[lesson.id];
        if (newTitle && newTitle.trim() && newTitle !== lesson.title) {
          const trimmedTitle = newTitle.trim();
          if (!trimmedTitle) {
            Alert.alert('Error', 'Lesson title cannot be empty');
            return;
          }

          // Update lesson title
          const updatedLesson: Lesson = {
            ...lesson,
            title: trimmedTitle,
            lastUpdated: new Date().toISOString().split('T')[0],
          };
          await databaseService.saveLesson(updatedLesson);
          await saveLessonToFileSystem(updatedLesson);

          // Update topic's lesson metadata
          if (topic) {
            const updatedLessons = topic.lessons.map(l =>
              l.id === lesson.id
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
            await createTopicFolderStructure(updatedTopic);
            setTopic(updatedTopic);
          }

          hasChanges = true;
        }
      }

      if (hasChanges) {
        await loadTopicData();
        Alert.alert('Success', 'Lessons updated successfully');
      }

      setIsEditMode(false);
      setEditingTitles({});
    } catch (error) {
      console.error('Failed to save lesson changes:', error);
      Alert.alert('Error', 'Failed to save changes');
    }
  }, [lessons, editingTitles, topic, loadTopicData]);

  const handleCancelEdit = useCallback(() => {
    setEditingTitles({});
    setIsEditMode(false);
  }, []);

  const handleDeleteLesson = useCallback(
    async (lessonId: string) => {
      const lesson = lessons.find(l => l.id === lessonId);
      if (!lesson) return;

      Alert.alert(
        'Delete Lesson',
        `Are you sure you want to delete "${lesson.title}"? This will also delete all notes in this lesson.`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                // Delete all notes for this lesson
                const notes = notesService.getNotes(topicId, lessonId);
                for (const note of notes) {
                  notesService.deleteNote(topicId, lessonId, note.id);
                }

                // Delete lesson from file system
                await deleteLessonFromFileSystem(lesson);

                // Delete from database
                await databaseService.deleteLesson(lessonId);

                // Update topic metadata - remove lesson and reorder remaining lessons
                if (topic) {
                  const updatedLessons = topic.lessons
                    .filter(l => l.id !== lessonId)
                    .map((l, index) => ({
                      ...l,
                      order: index + 1,
                    }));

                  // Update previousLesson/nextLesson references
                  const remainingLessons = lessons.filter(l => l.id !== lessonId);
                  for (let i = 0; i < remainingLessons.length; i++) {
                    const currentLesson = remainingLessons[i];
                    const updatedLesson: Lesson = {
                      ...currentLesson,
                      order: i + 1,
                      previousLesson: i > 0 ? remainingLessons[i - 1].id : null,
                      nextLesson: i < remainingLessons.length - 1 ? remainingLessons[i + 1].id : null,
                      lastUpdated: new Date().toISOString().split('T')[0],
                    };
                    await databaseService.saveLesson(updatedLesson);
                    await saveLessonToFileSystem(updatedLesson);
                  }

                  const updatedTopic: TopicMeta = {
                    ...topic,
                    lessons: updatedLessons,
                    lastUpdated: new Date().toISOString().split('T')[0],
                  };
                  await databaseService.saveTopic(updatedTopic);
                  await createTopicFolderStructure(updatedTopic);
                  setTopic(updatedTopic);
                }

                // Refresh lessons list
                await loadTopicData();

                Alert.alert('Success', 'Lesson deleted successfully');
              } catch (error) {
                console.error('Failed to delete lesson:', error);
                Alert.alert('Error', 'Failed to delete lesson');
              }
            },
          },
        ],
      );
    },
    [lessons, topic, topicId, loadTopicData],
  );

  const handleTitleChange = useCallback((lessonId: string, newTitle: string) => {
    setEditingTitles(prev => ({
      ...prev,
      [lessonId]: newTitle,
    }));
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
            {isEditMode ? (
              <>
                <TouchableOpacity style={styles.saveButton} onPress={handleSaveAllChanges}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={styles.editButton} onPress={handleToggleEditMode}>
                  <Text style={styles.editButtonText}>✏️</Text>
                </TouchableOpacity>
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
              </>
            )}
          </View>
        </View>

        {/* Bottom Row: View Toggle */}
        {!isEditMode && (
          <View style={styles.viewToggle}>
            <TouchableOpacity
              style={[styles.viewToggleButton, viewMode === 'lessons' && styles.viewToggleButtonActive]}
              onPress={() => setViewMode('lessons')}>
              <Text style={[styles.viewToggleText, viewMode === 'lessons' && styles.viewToggleTextActive]}>
                Lessons
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleButton, viewMode === 'notes' && styles.viewToggleButtonActive]}
              onPress={() => setViewMode('notes')}>
              <Text style={[styles.viewToggleText, viewMode === 'notes' && styles.viewToggleTextActive]}>Notes</Text>
            </TouchableOpacity>
          </View>
        )}
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
                  <View key={lesson.id} style={styles.lessonCard}>
                    <TouchableOpacity
                      style={styles.lessonCardContent}
                      onPress={() => !isEditMode && navigateToLesson(lesson)}
                      disabled={isEditMode}>
                      <View style={styles.lessonHeader}>
                        <View style={styles.lessonNumber}>
                          <Text style={styles.lessonNumberText}>{index + 1}</Text>
                        </View>
                        <View style={styles.lessonInfo}>
                          {isEditMode ? (
                            <TextInput
                              style={styles.lessonTitleInput}
                              value={editingTitles[lesson.id]}
                              onChangeText={newTitle => handleTitleChange(lesson.id, newTitle)}
                              placeholder="Lesson title"
                              placeholderTextColor="#6b7280"
                            />
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
                      {!isEditMode && <ArrowRightIcon color="white" width={18} height={18} />}
                    </TouchableOpacity>
                    {isEditMode && (
                      <TouchableOpacity
                        style={styles.deleteLessonButton}
                        onPress={() => handleDeleteLesson(lesson.id)}
                        hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                        <Text style={styles.deleteLessonButtonText}>🗑️</Text>
                      </TouchableOpacity>
                    )}
                  </View>
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
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
    flexDirection: 'row',
    alignItems: 'center',
  },
  lessonCardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
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
  lessonTitleInput: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#8b5cf6',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
  },
  deleteLessonButton: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteLessonButtonText: {
    fontSize: 20,
  },
  editButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    fontSize: 18,
    color: 'white',
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#ef4444',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
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
