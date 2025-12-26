import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import {useDebouncedCallback} from 'use-debounce';
import {TopicMeta, Lesson, Note} from '../../../lib/types';
import {databaseService} from '@/services/database';
import {useQuickRecord} from '@/hooks/useQuickRecord';
import {getOrCreateQuickNotesLesson, getQuickNotesLessonId, isQuickNotesLesson} from '@/utils/quickNotesUtils';
import {formatDuration} from '@/utils/noteUtils';
import {createEmptyTopic, createTopicFolderStructure} from '@/utils/topicUtils';
import {createLessonFromNote, saveLessonToFileSystem} from '@/utils/lessonUtils';
import {notesService} from '@/services/notesService';
import {createMMKV} from 'react-native-mmkv';
import PlusIcon from '@/assets/icons/plus.svg';
import CloseIcon from '@/assets/icons/circle-x.svg';

const recentTopicsStorage = createMMKV({
  id: 'recent-topics-storage',
});

const RECENT_TOPICS_KEY = 'recent_topics';
const MAX_RECENT_TOPICS = 5;

interface QuickRecordModalProps {
  visible: boolean;
  onClose: () => void;
  mode?: 'record-first' | 'select-then-record';
  initialTopicId?: string;
  onRecordingComplete?: (note: Note, topicId: string, lessonId: string) => void;
}

type ModalStep = 'topic-selection' | 'lesson-selection' | 'recording' | 'post-recording';

const QuickRecordModal: React.FC<QuickRecordModalProps> = ({
  visible,
  onClose,
  mode = 'select-then-record',
  initialTopicId,
  onRecordingComplete,
}) => {
  const [topics, setTopics] = useState<TopicMeta[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<TopicMeta[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<TopicMeta | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [step, setStep] = useState<ModalStep>('topic-selection');
  const [isLoadingTopics, setIsLoadingTopics] = useState<boolean>(false);
  const [isLoadingLessons, setIsLoadingLessons] = useState<boolean>(false);
  const [savedNote, setSavedNote] = useState<Note | null>(null);
  const [showCreateTopicInput, setShowCreateTopicInput] = useState<boolean>(false);
  const [newTopicName, setNewTopicName] = useState<string>('');

  // Get recent topics from storage
  const recentTopicIds = useMemo(() => {
    try {
      const recent = recentTopicsStorage.getString(RECENT_TOPICS_KEY);
      return recent ? JSON.parse(recent) : [];
    } catch {
      return [];
    }
  }, []);

  const recentTopics = useMemo(() => {
    return topics.filter(t => recentTopicIds.includes(t.id)).slice(0, MAX_RECENT_TOPICS);
  }, [topics, recentTopicIds]);

  // Load topics
  const loadTopics = useCallback(async () => {
    setIsLoadingTopics(true);
    try {
      const topicsData = await databaseService.getAllTopics();
      setTopics(topicsData);
      setFilteredTopics(topicsData);
    } catch (error) {
      console.error('Failed to load topics:', error);
      Alert.alert('Error', 'Failed to load topics');
    } finally {
      setIsLoadingTopics(false);
    }
  }, []);

  // Load lessons for selected topic
  const loadLessons = useCallback(
    async (topicId: string) => {
      setIsLoadingLessons(true);
      try {
        const lessonsData = await databaseService.getLessonsByTopic(topicId);
        lessonsData.sort((a, b) => a.order - b.order);
        setLessons(lessonsData);
      } catch (error) {
        console.error('Failed to load lessons:', error);
        Alert.alert('Error', 'Failed to load lessons');
      } finally {
        setIsLoadingLessons(false);
      }
    },
    [],
  );

  // Debounced search
  const debouncedSearch = useDebouncedCallback((query: string) => {
    if (!query.trim()) {
      setFilteredTopics(topics);
      return;
    }
    const filtered = topics.filter(
      topic =>
        topic.title.toLowerCase().includes(query.toLowerCase()) ||
        topic.description.toLowerCase().includes(query.toLowerCase()),
    );
    setFilteredTopics(filtered);
  }, 300);

  // Handle search input change
  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchQuery(text);
      debouncedSearch(text);
    },
    [debouncedSearch],
  );

  // Track recent topic
  const trackRecentTopic = useCallback((topicId: string) => {
    try {
      const recent = recentTopicsStorage.getString(RECENT_TOPICS_KEY);
      const recentList: string[] = recent ? JSON.parse(recent) : [];
      const updated = [topicId, ...recentList.filter(id => id !== topicId)].slice(0, MAX_RECENT_TOPICS);
      recentTopicsStorage.set(RECENT_TOPICS_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to track recent topic:', error);
    }
  }, []);

  // Handle topic selection
  const handleTopicSelect = useCallback(
    async (topic: TopicMeta) => {
      setSelectedTopic(topic);
      trackRecentTopic(topic.id);
      await loadLessons(topic.id);

      if (mode === 'record-first') {
        // In record-first mode, use Quick Notes lesson
        const quickNotesLessonId = getQuickNotesLessonId(topic.id);
        setSelectedLessonId(quickNotesLessonId);
        setStep('recording');
      } else {
        // In select-then-record mode, show lesson selection
        setStep('lesson-selection');
      }
    },
    [mode, loadLessons, trackRecentTopic],
  );

  // Handle create new topic
  const handleCreateTopic = useCallback(async () => {
    const trimmedName = newTopicName.trim();
    if (!trimmedName) {
      Alert.alert('Error', 'Please enter a topic name');
      return;
    }

    try {
      const newTopic = createEmptyTopic(trimmedName);
      await databaseService.saveTopic(newTopic);
      await createTopicFolderStructure(newTopic);
      await loadTopics();
      setShowCreateTopicInput(false);
      setNewTopicName('');
      await handleTopicSelect(newTopic);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create topic');
    }
  }, [newTopicName, loadTopics, handleTopicSelect]);

  // Handle lesson selection
  const handleLessonSelect = useCallback(
    async (lessonId: string | null) => {
      if (!selectedTopic) return;

      if (lessonId === 'new') {
        // Create new lesson from note
        if (!savedNote) {
          Alert.alert('Error', 'No note to create lesson from');
          return;
        }
        // This will be handled after recording
        setSelectedLessonId(null);
      } else if (lessonId === 'quick-notes') {
        // Use Quick Notes lesson
        const quickNotesLessonId = getQuickNotesLessonId(selectedTopic.id);
        await getOrCreateQuickNotesLesson(selectedTopic.id);
        setSelectedLessonId(quickNotesLessonId);
      } else {
        setSelectedLessonId(lessonId);
      }

      setStep('recording');
    },
    [selectedTopic, savedNote],
  );

  // Get current lesson ID for recording
  const currentLessonId = useMemo(() => {
    if (selectedLessonId) return selectedLessonId;
    if (selectedTopic && mode === 'record-first') {
      return getQuickNotesLessonId(selectedTopic.id);
    }
    return null;
  }, [selectedTopic, selectedLessonId, mode]);

  // Quick record hook
  const {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
  } = useQuickRecord({
    topicId: selectedTopic?.id || '',
    lessonId: currentLessonId || '',
    lessonTitle: selectedTopic?.title,
    autoCreateQuickNotes: true,
    onRecordingComplete: async () => {
      // Note is already saved by the hook
      if (selectedTopic && currentLessonId) {
        const notes = notesService.getNotes(selectedTopic.id, currentLessonId);
        const latestNote = notes[notes.length - 1];
        if (latestNote) {
          setSavedNote(latestNote);
          setStep('post-recording');
          onRecordingComplete?.(latestNote, selectedTopic.id, currentLessonId);
        }
      }
    },
  });

  // Initialize: load topics and set initial state
  useEffect(() => {
    if (visible) {
      loadTopics();
      if (mode === 'record-first' && initialTopicId) {
        // In record-first mode with initial topic, start recording immediately
        databaseService.getTopic(initialTopicId).then(topic => {
          if (topic) {
            handleTopicSelect(topic);
          }
        });
      } else if (mode === 'record-first') {
        // Record-first mode: show topic selection first
        setStep('topic-selection');
      } else {
        // Select-then-record mode: show topic selection
        setStep('topic-selection');
      }
    } else {
      // Reset state when modal closes
      setStep('topic-selection');
      setSelectedTopic(null);
      setSelectedLessonId(null);
      setSearchQuery('');
      setSavedNote(null);
      setShowCreateTopicInput(false);
      setNewTopicName('');
    }
  }, [visible, mode, initialTopicId, loadTopics, handleTopicSelect]);

  // Auto-start recording in record-first mode
  useEffect(() => {
    if (step === 'recording' && mode === 'record-first' && selectedTopic && !isRecording) {
      // Small delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        startRecording();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [step, mode, selectedTopic, isRecording, startRecording]);

  const handleClose = useCallback(() => {
    if (isRecording) {
      Alert.alert(
        'Recording in Progress',
        'Recording is in progress. Stop recording before closing?',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Stop & Close',
            style: 'destructive',
            onPress: async () => {
              await stopRecording();
              onClose();
            },
          },
        ],
      );
    } else {
      onClose();
    }
  }, [isRecording, stopRecording, onClose]);

  const handleAssignToLesson = useCallback(
    async (targetLessonId: string) => {
      if (!savedNote || !selectedTopic || !currentLessonId) return;

      try {
        notesService.moveNoteToLesson(savedNote.id, selectedTopic.id, currentLessonId, selectedTopic.id, targetLessonId);
        Alert.alert('Success', 'Note assigned to lesson successfully');
        onClose();
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to assign note to lesson');
      }
    },
    [savedNote, selectedTopic, currentLessonId, onClose],
  );

  const handleCreateLessonFromNote = useCallback(async () => {
    if (!savedNote || !selectedTopic || !currentLessonId) {
      Alert.alert('Error', 'Missing required information to create lesson');
      return;
    }

    try {
      const order = lessons.length + 1;
      const previousLessonId = lessons.length > 0 ? lessons[lessons.length - 1].id : null;
      const newLesson = createLessonFromNote(savedNote, selectedTopic.id, order, previousLessonId, null);

      // Update previous lesson's nextLesson reference
      if (previousLessonId && lessons.length > 0) {
        const previousLesson = lessons[lessons.length - 1];
        previousLesson.nextLesson = newLesson.id;
        await databaseService.saveLesson(previousLesson);
        await saveLessonToFileSystem(previousLesson);
      }

      // Save the new lesson
      await databaseService.saveLesson(newLesson);
      await saveLessonToFileSystem(newLesson);

      // Update note with real lessonId
      const updatedNote: Note = {
        ...savedNote,
        lessonId: newLesson.id,
      };
      notesService.moveNoteToLesson(
        savedNote.id,
        selectedTopic.id,
        currentLessonId || '',
        selectedTopic.id,
        newLesson.id,
      );

      // Update topic
      const updatedTopic: TopicMeta = {
        ...selectedTopic,
        lessons: [
          ...selectedTopic.lessons,
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
      await createTopicFolderStructure(updatedTopic);

      Alert.alert('Success', `Lesson "${newLesson.title}" created successfully!`);
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create lesson from note');
    }
  }, [savedNote, selectedTopic, lessons, currentLessonId, onClose]);

  // Render topic selection
  const renderTopicSelection = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Select Topic</Text>
      <TextInput
        style={styles.searchInput}
        placeholder="Search topics..."
        placeholderTextColor="#6b7280"
        value={searchQuery}
        onChangeText={handleSearchChange}
      />

      {showCreateTopicInput ? (
        <View style={styles.createTopicContainer}>
          <TextInput
            style={styles.input}
            placeholder="Topic name"
            placeholderTextColor="#6b7280"
            value={newTopicName}
            onChangeText={setNewTopicName}
            autoFocus
          />
          <View style={styles.createTopicButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowCreateTopicInput(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.createButton} onPress={handleCreateTopic}>
              <Text style={styles.createButtonText}>Create</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.newTopicButton} onPress={() => setShowCreateTopicInput(true)}>
          <PlusIcon color="white" width={16} height={16} />
          <Text style={styles.newTopicButtonText}>New Topic</Text>
        </TouchableOpacity>
      )}

      {isLoadingTopics ? (
        <ActivityIndicator size="large" color="#8b5cf6" style={styles.loader} />
      ) : (
        <ScrollView style={styles.list}>
          {recentTopics.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Recent</Text>
              {recentTopics.map(topic => (
                <TouchableOpacity key={topic.id} style={styles.topicItem} onPress={() => handleTopicSelect(topic)}>
                  <Text style={styles.topicIcon}>{topic.icon}</Text>
                  <View style={styles.topicInfo}>
                    <Text style={styles.topicTitle}>{topic.title}</Text>
                    <Text style={styles.topicDescription} numberOfLines={1}>
                      {topic.description || 'No description'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
              <Text style={styles.sectionTitle}>All Topics</Text>
            </>
          )}
          {filteredTopics.map(topic => (
            <TouchableOpacity key={topic.id} style={styles.topicItem} onPress={() => handleTopicSelect(topic)}>
              <Text style={styles.topicIcon}>{topic.icon}</Text>
              <View style={styles.topicInfo}>
                <Text style={styles.topicTitle}>{topic.title}</Text>
                <Text style={styles.topicDescription} numberOfLines={1}>
                  {topic.description || 'No description'}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  // Render lesson selection
  const renderLessonSelection = () => (
    <View style={styles.content}>
      <TouchableOpacity style={styles.backButton} onPress={() => setStep('topic-selection')}>
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Select Lesson</Text>
      <Text style={styles.subtitle}>{selectedTopic?.title}</Text>

      {isLoadingLessons ? (
        <ActivityIndicator size="large" color="#8b5cf6" style={styles.loader} />
      ) : (
        <ScrollView style={styles.list}>
          <TouchableOpacity style={styles.lessonItem} onPress={() => handleLessonSelect('quick-notes')}>
            <Text style={styles.lessonIcon}>📝</Text>
            <View style={styles.lessonInfo}>
              <Text style={styles.lessonTitle}>Quick Notes</Text>
              <Text style={styles.lessonDescription}>Save to Quick Notes (organize later)</Text>
            </View>
          </TouchableOpacity>
          {lessons.map(lesson => (
            <TouchableOpacity key={lesson.id} style={styles.lessonItem} onPress={() => handleLessonSelect(lesson.id)}>
              <Text style={styles.lessonIcon}>📄</Text>
              <View style={styles.lessonInfo}>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                <Text style={styles.lessonDescription}>{lesson.duration}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.lessonItem} onPress={() => handleLessonSelect('new')}>
            <PlusIcon color="#8b5cf6" width={20} height={20} />
            <View style={styles.lessonInfo}>
              <Text style={styles.lessonTitle}>Create New Lesson</Text>
              <Text style={styles.lessonDescription}>Create a new lesson from this note</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );

  // Render recording UI
  const renderRecording = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Recording</Text>
      <Text style={styles.subtitle}>{selectedTopic?.title}</Text>

      <View style={styles.recordingContainer}>
        <View style={styles.recordingIndicator}>
          <View style={[styles.recordingDot, isRecording && styles.recordingDotActive]} />
          <Text style={styles.recordingText}>{isRecording ? 'Recording...' : 'Ready to Record'}</Text>
        </View>

        <Text style={styles.durationText}>{formatDuration(recordingDuration)}</Text>

        {isRecording ? (
          <TouchableOpacity style={styles.stopButton} onPress={stopRecording}>
            <Text style={styles.stopButtonText}>⏹ Stop Recording</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.recordButton} onPress={startRecording}>
            <Text style={styles.recordButtonText}>🎤 Start Recording</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Render post-recording UI
  const renderPostRecording = () => (
    <View style={styles.content}>
      <Text style={styles.title}>Note Saved!</Text>
      <Text style={styles.subtitle}>{savedNote?.title}</Text>

      <View style={styles.postRecordingContainer}>
        <Text style={styles.successText}>✓ Audio note saved successfully</Text>

        <Text style={styles.sectionTitle}>Assign to Lesson</Text>
        <ScrollView style={styles.list}>
          {lessons.map(lesson => (
            <TouchableOpacity
              key={lesson.id}
              style={styles.lessonItem}
              onPress={() => handleAssignToLesson(lesson.id)}>
              <Text style={styles.lessonIcon}>📄</Text>
              <View style={styles.lessonInfo}>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                <Text style={styles.lessonDescription}>{lesson.duration}</Text>
              </View>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.lessonItem} onPress={handleCreateLessonFromNote}>
            <PlusIcon color="#8b5cf6" width={20} height={20} />
            <View style={styles.lessonInfo}>
              <Text style={styles.lessonTitle}>Create New Lesson</Text>
              <Text style={styles.lessonDescription}>Create a new lesson from this note</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>

        <TouchableOpacity style={styles.doneButton} onPress={onClose}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <CloseIcon color="white" width={24} height={24} />
          </TouchableOpacity>

          {step === 'topic-selection' && renderTopicSelection()}
          {step === 'lesson-selection' && renderLessonSelection()}
          {step === 'recording' && renderRecording()}
          {step === 'post-recording' && renderPostRecording()}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingTop: 16,
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  content: {
    padding: 20,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    marginBottom: 20,
  },
  searchInput: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: 'white',
    marginBottom: 16,
  },
  list: {
    maxHeight: 400,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b5cf6',
    marginTop: 16,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  topicIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  topicInfo: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  topicDescription: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0a0a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333333',
  },
  lessonIcon: {
    fontSize: 24,
    marginRight: 16,
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
  lessonDescription: {
    fontSize: 14,
    color: '#a1a1aa',
  },
  newTopicButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  newTopicButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  createTopicContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: 'white',
    marginBottom: 12,
  },
  createTopicButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#374151',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  createButton: {
    flex: 1,
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    color: '#8b5cf6',
    fontSize: 16,
    fontWeight: '500',
  },
  recordingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#666666',
  },
  recordingDotActive: {
    backgroundColor: '#dc2626',
  },
  recordingText: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  durationText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#8b5cf6',
    fontFamily: 'monospace',
    marginBottom: 32,
  },
  recordButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  recordButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  stopButton: {
    backgroundColor: '#dc2626',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  stopButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  postRecordingContainer: {
    paddingVertical: 20,
  },
  successText: {
    fontSize: 16,
    color: '#10b981',
    marginBottom: 24,
    textAlign: 'center',
  },
  doneButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  loader: {
    marginVertical: 40,
  },
});

export default QuickRecordModal;

