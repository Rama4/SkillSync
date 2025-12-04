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
import {RootStackParamList} from '../../../lib/mobile_types';
import {TopicMeta, Lesson} from '../../../lib/types';
import {databaseService} from '../services/database';

type Props = NativeStackScreenProps<RootStackParamList, 'Topic'>;

const TopicScreen: React.FC<Props> = ({navigation, route}) => {
  const {topicId, topicTitle} = route.params;
  const [topic, setTopic] = useState<TopicMeta | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTopicData();
  }, [topicId]);

  const loadTopicData = async () => {
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
    } catch (error) {
      console.error('Failed to load topic data:', error);
      Alert.alert('Error', 'Failed to load topic data.');
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToLesson = (lesson: Lesson) => {
    navigation.navigate('Lesson', {
      lessonId: lesson.id,
      topicId: topicId,
      lessonTitle: lesson.title,
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return '#10b981';
      case 'intermediate':
        return '#f59e0b';
      case 'advanced':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return '🟢';
      case 'intermediate':
        return '🟡';
      case 'advanced':
        return '🔴';
      default:
        return '⚪';
    }
  };

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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}>
        {/* Topic Header */}
        {topic && (
          <View style={styles.topicHeader}>
            <Text style={styles.topicIcon}>{topic.icon}</Text>
            <View style={styles.topicInfo}>
              <Text style={styles.topicTitle}>{topic.title}</Text>
              <Text style={styles.topicDescription}>{topic.description}</Text>
              {topic.tags.length > 0 && (
                <View style={styles.tagsContainer}>
                  {topic.tags.map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Lessons List */}
        {lessons.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Lessons ({lessons.length})</Text>
            {lessons.map((lesson, index) => (
              <TouchableOpacity
                key={lesson.id}
                style={styles.lessonCard}
                onPress={() => navigateToLesson(lesson)}>
                <View style={styles.lessonHeader}>
                  <View style={styles.lessonNumber}>
                    <Text style={styles.lessonNumberText}>{index + 1}</Text>
                  </View>
                  <View style={styles.lessonInfo}>
                    <Text style={styles.lessonTitle}>{lesson.title}</Text>
                    <View style={styles.lessonMeta}>
                      <Text style={styles.duration}>⏱️ {lesson.duration}</Text>
                      <View style={styles.difficulty}>
                        <Text style={styles.difficultyIcon}>
                          {getDifficultyIcon(lesson.difficulty)}
                        </Text>
                        <Text
                          style={[
                            styles.difficultyText,
                            {color: getDifficultyColor(lesson.difficulty)},
                          ]}>
                          {lesson.difficulty}
                        </Text>
                      </View>
                    </View>
                    {lesson.objectives.length > 0 && (
                      <Text style={styles.objectives} numberOfLines={2}>
                        {lesson.objectives[0]}
                      </Text>
                    )}
                  </View>
                </View>
                <Text style={styles.arrow}>→</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Empty State */}
        {lessons.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Lessons Available</Text>
            <Text style={styles.emptyStateText}>
              No lessons found for this topic. The content might not be
              downloaded yet.
            </Text>
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
    color: '#ffffff',
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
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
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
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
  arrow: {
    fontSize: 18,
    color: '#666666',
    marginLeft: 12,
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
    lineHeight: 22,
  },
});

export default TopicScreen;
