import React, {useState, useEffect, useCallback} from 'react';
import {View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useDebouncedCallback} from 'use-debounce';
import {TopicMeta} from '../../../lib/types';
import {RootStackParamList} from '../../../lib/mobile_types';
import {databaseService} from '@/services/database';
import {syncService} from '@/services/syncService';
import CreateTopicModal from '@/components/CreateTopicModal';
import {createEmptyTopic, createTopicFolderStructure} from '@/utils/topicUtils';
import ReloadIcon from '@/assets/icons/reload.svg';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<Props> = ({navigation}) => {
  const [topics, setTopics] = useState<TopicMeta[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

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

  const initializeApp = useCallback(async () => {
    try {
      // Initialize database
      await databaseService.initDatabase();

      // Check if we have data
      const hasData = await syncService.isDataAvailable();

      if (!hasData) {
        // First time setup - just load topics (empty state will be shown)
        await loadTopics();
      } else {
        // Load existing data
        await loadTopics();
      }
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

  const navigateToTopic = (topic: TopicMeta) => {
    navigation.navigate('Topic', {
      topicId: topic.id,
      topicTitle: topic.title,
    });
  };

  const goToSettings = () => {
    navigation.navigate('Settings');
  };

  const handleReloadContent = useDebouncedCallback(
    async () => {
      if (isSyncing) return; // Prevent multiple simultaneous syncs

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
    },
    1000,
    {leading: true, trailing: false},
  );

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
          <Text style={styles.title}>📚 SkillSync</Text>
          <Text style={styles.subtitle}>Choose a topic to start learning</Text>
          <View style={styles.headerButtons}>
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
        {!isLoading && topics.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Available Topics</Text>
            {topics.map(topic => (
              <TouchableOpacity key={topic.id} style={styles.topicCard} onPress={() => navigateToTopic(topic)}>
                <View style={styles.topicHeader}>
                  <Text style={styles.topicIcon}>{topic.icon}</Text>
                  <View style={styles.topicInfo}>
                    <Text style={styles.topicTitle}>{topic.title}</Text>
                    <Text style={styles.topicDescription}>{topic.description}</Text>
                  </View>
                </View>
                <View style={styles.topicMeta}>
                  <Text style={styles.lessonCount}>
                    {topic.lessons.length} lesson
                    {topic.lessons.length !== 1 ? 's' : ''}
                  </Text>
                  <Text style={styles.arrow}>→</Text>
                </View>
              </TouchableOpacity>
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
    alignItems: 'center',
    marginBottom: 30,
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
    marginBottom: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
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
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
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
