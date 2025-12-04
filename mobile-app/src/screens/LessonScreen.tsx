import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import Markdown from 'react-native-markdown-display';
import Video from 'react-native-video';
// import VideoPlayer from 'react-native-video-controls';
import {RootStackParamList} from '../../../lib/mobile_types';
import {LessonSection, Lesson} from '../../../lib/types';
import {databaseService} from '../services/database';
import NotesPanel from '../components/NotesPanel';
import {fileExists} from '../utils/fsUtils';
import {DOWNLOAD_DATA_PATH} from '../services/syncService';

// CONFIGURATION
// Replace this with your actual API URL (e.g., 'http://localhost:3000' or your production URL)
// The web app used relative paths ('/api/media'), but RN needs an absolute URL.
const API_BASE_URL = 'http://10.0.2.2:3000';

type Props = NativeStackScreenProps<RootStackParamList, 'Lesson'>;

const {width: screenWidth} = Dimensions.get('window');

const LessonScreen: React.FC<Props> = ({navigation, route}) => {
  const {lessonId, topicId, lessonTitle} = route.params;
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState('');

  const [dynamicContent, setDynamicContent] = useState<string>('');
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  const [showNotes, setShowNotes] = useState(false);

  const currentSection: LessonSection | undefined =
    lesson?.sections[currentSectionIndex];
  const isFirstSection = currentSectionIndex === 0;
  const isLastSection = currentSectionIndex === lesson?.sections.length - 1;

  // Determine if this section is a video type
  const isVideoSection =
    currentSection?.type === 'video' ||
    (currentSection?.fileType === 'video' && !!currentSection?.filePath);

  useEffect(() => {
    loadLessonData();
  }, [lessonId]);

  const loadLessonData = async () => {
    try {
      setIsLoading(true);
      const lessonData = await databaseService.getLesson(lessonId);
      if (lessonData) {
        setLesson(lessonData);
      } else {
        Alert.alert('Error', 'Lesson not found.');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Failed to load lesson data:', error);
      Alert.alert('Error', 'Failed to load lesson data.');
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  };

  // Effect to handle content fetching
  useEffect(() => {
    if (!lesson) return;

    const section = lesson.sections[currentSectionIndex];

    // Reset dynamic content when section changes
    setDynamicContent('');

    // Case 1: Content already exists
    if (section.content) {
      setDynamicContent(section.content);
      return;
    }

    // Case 2: Markdown file needs fetching
    if (
      (section.type === 'markdown' || section.fileType === 'markdown') &&
      section.filePath
    ) {
      setIsLoadingContent(true);
      const mediaUrl = `${API_BASE_URL}/api/media/${topicId}/${section.filePath}`;

      fetch(mediaUrl)
        .then(res => res.text())
        .then(text => {
          setDynamicContent(text);
          setIsLoadingContent(false);
        })
        .catch(err => {
          console.error('Error loading markdown:', err);
          setDynamicContent('Failed to load content.');
          setIsLoadingContent(false);
        });
    }
  }, [currentSectionIndex, lesson, topicId]);

  useEffect(() => {
    if (isVideoSection) {
      async function initializeVideoUrl() {
        console.log('initializeVideoUrl(): setting video url');
        let _videoUrl = '';
        if (currentSection?.filePath) {
          console.log('constructing video url');
          _videoUrl = `${DOWNLOAD_DATA_PATH}/${topicId}/${currentSection?.filePath}`;
        }
        console.log('rendering video: path=', _videoUrl);
        // check if path exists
        const topicsFileExists = await fileExists(_videoUrl);
        if (topicsFileExists) {
          console.log('video url exists');
          setVideoUrl(_videoUrl);
        } else {
          console.error('video url doesnt exist');
        }
      }
      initializeVideoUrl();
    }
    // Construct Video URL
  }, [currentSection?.filePath, isVideoSection, topicId]);

  const goToNextSection = () => {
    if (lesson && currentSectionIndex < lesson.sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
    }
  };

  const goToPreviousSection = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
    }
  };

  const goToSection = (index: number) => {
    setCurrentSectionIndex(index);
  };

  const markdownStyles = {
    body: {color: '#ffffff', fontSize: 16, lineHeight: 24},
    heading1: {
      color: '#ffffff',
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 16,
      marginTop: 20,
    },
    heading2: {
      color: '#ffffff',
      fontSize: 20,
      fontWeight: '600',
      marginBottom: 12,
      marginTop: 16,
    },
    heading3: {
      color: '#ffffff',
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 8,
      marginTop: 12,
    },
    paragraph: {
      color: '#e5e5e5',
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 12,
    },
    strong: {color: '#ffffff', fontWeight: 'bold'},
    em: {color: '#a1a1aa', fontStyle: 'italic'},
    code_inline: {
      backgroundColor: '#333333',
      color: '#f59e0b',
      paddingHorizontal: 4,
      paddingVertical: 2,
      borderRadius: 4,
      fontSize: 14,
      fontFamily: 'monospace',
    },
    code_block: {
      backgroundColor: '#1a1a1a',
      borderRadius: 8,
      padding: 16,
      marginVertical: 12,
      borderWidth: 1,
      borderColor: '#333333',
    },
    fence: {
      backgroundColor: '#1a1a1a',
      borderRadius: 8,
      padding: 16,
      marginVertical: 12,
      borderWidth: 1,
      borderColor: '#333333',
    },
    list_item: {
      color: '#e5e5e5',
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 4,
    },
    table: {
      borderWidth: 1,
      borderColor: '#333333',
      borderRadius: 8,
      marginVertical: 12,
    },
    thead: {backgroundColor: '#1a1a1a'},
    th: {
      color: '#ffffff',
      fontWeight: 'bold',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#333333',
    },
    td: {
      color: '#e5e5e5',
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: '#333333',
    },
    blockquote: {
      backgroundColor: '#1a1a1a',
      borderLeftWidth: 4,
      borderLeftColor: '#8b5cf6',
      paddingLeft: 16,
      paddingVertical: 8,
      marginVertical: 12,
    },
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
        <Text style={styles.loadingText}>Loading lesson...</Text>
      </View>
    );
  }

  if (!lesson) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Lesson not found</Text>
      </View>
    );
  }

  if (showNotes) {
    return (
      <View style={styles.container}>
        <View style={styles.notesHeader}>
          <TouchableOpacity
            style={styles.backToLessonButton}
            onPress={() => setShowNotes(false)}>
            <Text style={styles.backToLessonButtonText}>← Back to Lesson</Text>
          </TouchableOpacity>
          <Text style={styles.notesTitle}>Notes</Text>
        </View>
        <NotesPanel topicId={topicId} lessonId={lessonId} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Progress Header */}
      <View style={styles.progressHeader}>
        <View style={styles.progressInfo}>
          <Text style={styles.progressText}>
            {currentSectionIndex + 1} of {lesson.sections.length}
          </Text>
          <Text style={styles.sectionTitle}>{currentSection?.title}</Text>
        </View>
        <TouchableOpacity
          style={styles.notesButton}
          onPress={() => setShowNotes(true)}>
          <Text style={styles.notesButtonText}>📝 Notes</Text>
        </TouchableOpacity>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${
                  ((currentSectionIndex + 1) / lesson.sections.length) * 100
                }%`,
              },
            ]}
          />
        </View>
      </View>

      {/* Section Content */}
      <ScrollView
        style={styles.contentContainer}
        contentContainerStyle={styles.content}>
        <View style={styles.flashCard}>
          <Text style={styles.flashCardTitle}>{currentSection?.title}</Text>

          {/* Video Player Section */}
          {isVideoSection && videoUrl && (
            <View style={styles.videoContainer}>
              <Video
                source={{uri: videoUrl}}
                style={styles.videoPlayer}
                // seekColor="red"
                controls={true}
                // disableSeekbar
                resizeMode="contain"
                paused={true} // Start paused so it doesn't auto-blast audio
                onError={(e: any) => console.log('Video Error:', e)}
              />
            </View>
          )}

          {/* Markdown Content (Dynamically loaded or Static) */}
          {isLoadingContent ? (
            <ActivityIndicator
              size="small"
              color="#8b5cf6"
              style={{marginTop: 20}}
            />
          ) : (
            <Markdown style={markdownStyles}>{dynamicContent}</Markdown>
          )}
        </View>
      </ScrollView>

      {/* Navigation Controls */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[styles.navButton, isFirstSection && styles.navButtonDisabled]}
          onPress={goToPreviousSection}
          disabled={isFirstSection}>
          <Text
            style={[
              styles.navButtonText,
              isFirstSection && styles.navButtonTextDisabled,
            ]}>
            ← Previous
          </Text>
        </TouchableOpacity>

        <View style={styles.sectionIndicators}>
          {lesson.sections.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.sectionDot,
                index === currentSectionIndex && styles.sectionDotActive,
              ]}
              onPress={() => goToSection(index)}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.navButton, isLastSection && styles.navButtonDisabled]}
          onPress={goToNextSection}
          disabled={isLastSection}>
          <Text
            style={[
              styles.navButtonText,
              isLastSection && styles.navButtonTextDisabled,
            ]}>
            Next →
          </Text>
        </TouchableOpacity>
      </View>
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
  progressHeader: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  notesHeader: {
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backToLessonButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#374151',
  },
  backToLessonButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  notesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  notesButton: {
    position: 'absolute',
    right: 20,
    top: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#8b5cf6',
  },
  notesButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  progressInfo: {
    marginBottom: 12,
  },
  progressText: {
    fontSize: 14,
    color: '#8b5cf6',
    fontWeight: '500',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8b5cf6',
    borderRadius: 2,
  },
  contentContainer: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  flashCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#333333',
    minHeight: screenWidth * 0.8,
  },
  flashCardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  videoContainer: {
    width: '100%',
    height: 220, // 16:9 Aspect ratio approx
    marginBottom: 20,
    backgroundColor: '#000',
    borderRadius: 12,
    overflow: 'hidden',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  navButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 80,
  },
  navButtonDisabled: {
    backgroundColor: '#333333',
  },
  navButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  navButtonTextDisabled: {
    color: '#666666',
  },
  sectionIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#333333',
    marginHorizontal: 4,
  },
  sectionDotActive: {
    backgroundColor: '#8b5cf6',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  loadingText: {
    color: '#a1a1aa',
    fontSize: 16,
    marginTop: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: '500',
  },
});

export default LessonScreen;
