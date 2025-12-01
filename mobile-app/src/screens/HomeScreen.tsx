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
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import {RootStackParamList, TopicMeta} from '../types';
import {databaseService} from '../services/database';
import {syncService} from '../services/syncService';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const HomeScreen: React.FC<Props> = ({navigation}) => {
  const [topics, setTopics] = useState<TopicMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // Initialize database
      await databaseService.initDatabase();

      // Check if we have data
      const hasData = await syncService.isDataAvailable();

      if (!hasData) {
        // First time setup - show sync prompt
        Alert.alert(
          'Welcome to SkillSync!',
          'This is your first time using the app. Make sure you have placed your learning content in Download/SkillSync/data/ folder, then load it into the app.',
          [
            {text: 'Later', style: 'cancel'},
            {text: 'Load Content', onPress: performInitialSync},
          ],
        );
      } else {
        // Load existing data
        await loadTopics();
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
      Alert.alert('Error', 'Failed to initialize the app. Please try again.');
    } finally {
      setIsInitializing(false);
    }
  };

  const performInitialSync = async () => {
    setIsLoading(true);
    try {
      await syncService.syncAllData();
      await loadTopics();
    } catch (error) {
      console.error('Initial sync failed:', error);
      Alert.alert(
        'Sync Failed',
        'Failed to download content. Please check your internet connection and try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const loadTopics = async () => {
    try {
      const topicsData = await databaseService.getAllTopics();
      setTopics(topicsData);
    } catch (error) {
      console.error('Failed to load topics:', error);
      Alert.alert('Error', 'Failed to load topics from database.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToTopic = (topic: TopicMeta) => {
    navigation.navigate('Topic', {
      topicId: topic.id,
      topicTitle: topic.title,
    });
  };

  const goToSettings = () => {
    navigation.navigate('Settings');
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>📚 SkillSync</Text>
          <Text style={styles.subtitle}>Choose a topic to start learning</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={goToSettings}>
            <Text style={styles.settingsButtonText}>⚙️ Settings</Text>
          </TouchableOpacity>
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
              <TouchableOpacity
                key={topic.id}
                style={styles.topicCard}
                onPress={() => navigateToTopic(topic)}>
                <View style={styles.topicHeader}>
                  <Text style={styles.topicIcon}>{topic.icon}</Text>
                  <View style={styles.topicInfo}>
                    <Text style={styles.topicTitle}>{topic.title}</Text>
                    <Text style={styles.topicDescription}>
                      {topic.description}
                    </Text>
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
              No learning content found. Make sure your content is in
              Download/SkillSync/data/ folder, then go to Settings to load
              content.
            </Text>
            <TouchableOpacity style={styles.button} onPress={goToSettings}>
              <Text style={styles.buttonText}>Go to Settings</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
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
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#a1a1aa',
    marginBottom: 16,
  },
  settingsButton: {
    backgroundColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  settingsButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
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
    color: '#ffffff',
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
    color: '#ffffff',
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
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default HomeScreen;
