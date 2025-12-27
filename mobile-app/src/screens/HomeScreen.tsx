import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert, TextInput} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useDebouncedCallback} from 'use-debounce';
import {TopicMeta, Note} from '../../../lib/types';
import {RootStackParamList} from '../../../lib/mobile_types';
import {databaseService} from '@/services/database';
import {syncService} from '@/services/syncService';
import CreateTopicModal from '@/components/CreateTopicModal';
import QuickRecordModal from '@/components/QuickRecordModal';
import FloatingActionButton from '@/components/FloatingActionButton';
import {createEmptyTopic, createTopicFolderStructure, deleteTopicFromFileSystem} from '@/utils/topicUtils';
import ReloadIcon from '@/assets/icons/reload.svg';
import {createMMKV} from 'react-native-mmkv';
import {notesService} from '@/services/notesService';

const recentTopicsStorage = createMMKV({
  id: 'recent-topics-storage',
});

const RECENT_TOPICS_KEY = 'recent_topics';
const MAX_RECENT_TOPICS = 5;

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<Props> = ({navigation}) => {
  const [topics, setTopics] = useState<TopicMeta[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showQuickRecordModal, setShowQuickRecordModal] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingTitles, setEditingTitles] = useState<Record<string, string>>({});

  // Memoize topics list for performance
  const memoizedTopics = useMemo(() => topics, [topics]);

  const loadTopics = useCallback(async () => {
    try {
      const topicsData = await databaseService.getAllTopics();
      setTopics(topicsData);
    } catch (error) {
      console.error('Failed to load topics:', error);
      Alert.alert('Error', 'Failed to load topics from database.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const syncContent = useCallback(async () => {
    if (isSyncing) {
      return;
    }

    setIsSyncing(true);
    setIsLoading(true);

    try {
      await syncService.syncAllData();
      await loadTopics();
    } catch (error) {
      console.error('Sync failed:', error);
      Alert.alert('Sync Failed', 'Failed to load content. Please check your internet connection and try again.');
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, [isSyncing, loadTopics]);

  const initializeApp = useCallback(async () => {
    try {
      // Initialize database and wait for it to be ready
      console.log('initializeApp() starting database initialization');
      await databaseService.initDatabase();
      console.log('initializeApp() database initialized');

      // Check if we have data
      const hasData = await syncService.isDataAvailable();
      console.log('initializeApp()', 'hasData', hasData);

      // Perform initial sync and load
      await syncService.syncAllData();
      await loadTopics();
      console.log('initializeApp()', 'topics loaded');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      Alert.alert('Error', 'Failed to initialize the app. Please try again.');
    }
  }, [loadTopics]);

  useEffect(() => {
    if (isInitializing) {
      (async () => {
        await initializeApp();
        setIsInitializing(false);
      })();
    }
  }, [isInitializing, initializeApp]);

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

  const navigateToTopic = useCallback(
    (topic: TopicMeta) => {
      trackRecentTopic(topic.id);
      navigation.navigate('Topic', {
        topicId: topic.id,
        topicTitle: topic.title,
      });
    },
    [navigation, trackRecentTopic],
  );

  const goToSettings = () => {
    navigation.navigate('Settings');
  };

  const handleReloadContent = useDebouncedCallback(syncContent, 1000, {leading: true, trailing: false});

  const handleCreateTopic = async (title: string) => {
    try {
      // Check if topic with same ID already exists
      const topicId = createEmptyTopic(title).id;
      const existingTopic = await databaseService.getTopic(topicId);
      if (existingTopic) {
        throw new Error(`Topic "${title}" already exists`);
      }

      // Create empty topic
      const newTopic = createEmptyTopic(title);

      // Save to database
      await databaseService.saveTopic(newTopic);

      // Create folder structure and topic.json file for persistence
      // This ensures the topic will be discovered during sync
      await createTopicFolderStructure(newTopic);

      // Refresh topics list
      await loadTopics();

      // Navigate to the newly created topic
      navigation.navigate('Topic', {
        topicId: newTopic.id,
        topicTitle: newTopic.title,
      });
    } catch (error: any) {
      console.error('Failed to create topic:', error);
      throw error;
    }
  };

  const handleToggleEditMode = useCallback(() => {
    if (isEditMode) {
      // Exiting edit mode - cancel all edits
      setEditingTitles({});
    } else {
      // Entering edit mode - initialize editing titles
      const initialTitles: Record<string, string> = {};
      topics.forEach(topic => {
        initialTitles[topic.id] = topic.title;
      });
      setEditingTitles(initialTitles);
    }
    setIsEditMode(!isEditMode);
  }, [isEditMode, topics]);

  const handleSaveAllChanges = useCallback(async () => {
    try {
      let hasChanges = false;

      // Save all topic title changes
      for (const topic of topics) {
        const newTitle = editingTitles[topic.id];
        if (newTitle && newTitle.trim() && newTitle !== topic.title) {
          const trimmedTitle = newTitle.trim();
          const updatedTopic: TopicMeta = {
            ...topic,
            title: trimmedTitle,
            lastUpdated: new Date().toISOString().split('T')[0],
          };
          await databaseService.saveTopic(updatedTopic);
          await createTopicFolderStructure(updatedTopic);
          hasChanges = true;
        }
      }

      if (hasChanges) {
        await loadTopics();
        Alert.alert('Success', 'Topics updated successfully');
      }

      setIsEditMode(false);
      setEditingTitles({});
    } catch (error) {
      console.error('Failed to save topic changes:', error);
      Alert.alert('Error', 'Failed to save changes');
    }
  }, [topics, editingTitles, loadTopics]);

  const handleCancelEdit = useCallback(() => {
    setEditingTitles({});
    setIsEditMode(false);
  }, []);

  const handleDeleteTopic = useCallback(
    async (topicId: string) => {
      const topic = topics.find(t => t.id === topicId);
      if (!topic) return;

      Alert.alert(
        'Delete Topic',
        `Are you sure you want to delete "${topic.title}"? This will also delete all lessons and notes in this topic.`,
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                // Get all lessons for this topic
                const lessons = await databaseService.getLessonsByTopic(topicId);

                // Delete all notes for all lessons
                for (const lesson of lessons) {
                  const notes = notesService.getNotes(topicId, lesson.id);
                  for (const note of notes) {
                    notesService.deleteNote(topicId, lesson.id, note.id);
                  }
                }

                // Delete from file system (includes lessons and notes cleanup)
                await deleteTopicFromFileSystem(topicId);

                // Delete from database (cascade deletes lessons)
                await databaseService.deleteTopic(topicId);

                // Refresh topics list
                await loadTopics();

                Alert.alert('Success', 'Topic deleted successfully');
              } catch (error) {
                console.error('Failed to delete topic:', error);
                Alert.alert('Error', 'Failed to delete topic');
              }
            },
          },
        ],
      );
    },
    [topics, loadTopics],
  );

  const handleTitleChange = useCallback((topicId: string, newTitle: string) => {
    setEditingTitles(prev => ({
      ...prev,
      [topicId]: newTitle,
    }));
  }, []);

  if (isInitializing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Initializing SkillSync...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>📚 SkillSync</Text>
              <Text style={styles.subtitle}>Choose a topic to start learning</Text>
            </View>
            <TouchableOpacity style={styles.editButton} onPress={handleToggleEditMode}>
              <Text style={styles.editButtonText}>{isEditMode ? '✕' : '✏️'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerButtons}>
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
                <TouchableOpacity style={styles.createButton} onPress={() => setShowCreateModal(true)}>
                  <Text style={styles.createButtonText}>+ New Topic</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.settingsButton} onPress={goToSettings}>
                  <Text style={styles.settingsButtonText}>⚙️ Settings</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.settingsButton, isSyncing && styles.syncingButton]}
                  onPress={handleReloadContent}
                  disabled={isSyncing}>
                  <ReloadIcon width={20} height={20} color={isSyncing ? '#666666' : 'white'} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* Loading State */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8b5cf6" />
            <Text style={styles.loadingText}>Loading topics...</Text>
          </View>
        )}

        {/* Topics List */}
        {!isLoading && memoizedTopics.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Available Topics</Text>
            {memoizedTopics.map(topic => (
              <View key={topic.id} style={styles.topicCard}>
                <TouchableOpacity
                  style={styles.topicCardContent}
                  onPress={() => !isEditMode && navigateToTopic(topic)}
                  disabled={isEditMode}>
                  <View style={styles.topicHeader}>
                    <Text style={styles.topicIcon}>{topic.icon}</Text>
                    <View style={styles.topicInfo}>
                      {isEditMode ? (
                        <TextInput
                          style={styles.topicTitleInput}
                          value={editingTitles[topic.id] || topic.title}
                          onChangeText={newTitle => handleTitleChange(topic.id, newTitle)}
                          placeholder="Topic title"
                          placeholderTextColor="#6b7280"
                        />
                      ) : (
                        <Text style={styles.topicTitle}>{topic.title}</Text>
                      )}
                      <Text style={styles.topicDescription}>{topic.description}</Text>
                    </View>
                  </View>
                  {!isEditMode && (
                    <View style={styles.topicMeta}>
                      <Text style={styles.lessonCount}>
                        {topic.lessons.length} lesson
                        {topic.lessons.length !== 1 ? 's' : ''}
                      </Text>
                      <Text style={styles.arrow}>→</Text>
                    </View>
                  )}
                </TouchableOpacity>
                {isEditMode && (
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteTopic(topic.id)}
                    hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                    <Text style={styles.deleteButtonText}>🗑️</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Empty State */}
        {!isLoading && topics.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Content Available</Text>
            <Text style={styles.emptyStateText}>
              No learning content found. Make sure your content is in Download/SkillSync/data/ folder, then go to
              Settings to load content.
            </Text>
            <TouchableOpacity style={styles.button} onPress={goToSettings}>
              <Text style={styles.buttonText}>Go to Settings</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Create Topic Modal */}
      <CreateTopicModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateTopic={handleCreateTopic}
      />

      {/* Quick Record Modal */}
      <QuickRecordModal
        visible={showQuickRecordModal}
        onClose={() => setShowQuickRecordModal(false)}
        mode="record-first"
        onRecordingComplete={async (_note: Note, _topicId: string, _lessonId: string) => {
          // Refresh topics list after recording
          await loadTopics();
        }}
      />

      {/* Floating Action Button for Quick Recording */}
      <FloatingActionButton onPress={() => setShowQuickRecordModal(true)} iconText="🎤" position="bottom-right" />
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
  header: {
    marginBottom: 30,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a1a1aa',
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
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 8,
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  settingsButton: {
    backgroundColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  settingsButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  syncingButton: {
    opacity: 0.5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
  },
  topicCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
    flexDirection: 'row',
    alignItems: 'center',
  },
  topicCardContent: {
    flex: 1,
    padding: 20,
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  topicIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  topicInfo: {
    flex: 1,
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  topicTitleInput: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#8b5cf6',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 4,
  },
  deleteButton: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButtonText: {
    fontSize: 20,
  },
  topicDescription: {
    fontSize: 14,
    color: '#a1a1aa',
    lineHeight: 20,
  },
  topicMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lessonCount: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  arrow: {
    fontSize: 18,
    color: '#666666',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
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
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minWidth: 150,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;
