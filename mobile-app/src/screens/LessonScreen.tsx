import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import Markdown from 'react-native-markdown-display';
import Video from 'react-native-video';
import {RootStackParamList} from '../../../lib/mobile_types';
import {LessonSection, Lesson} from '../../../lib/types';
import {databaseService} from '@/services/database';
import NotesPanel, {NotesPanelHandle} from '@/components/NotesPanel';
import {isFileOrFolderExists} from '@/utils/fsUtils';
import {DOWNLOAD_DATA_PATH} from '@/utils/constants';
import {API_BASE_URL} from '@/utils/constants';
import {formatDuration} from '@/utils/noteUtils';
import {useQuickRecord} from '@/hooks/useQuickRecord';
import ArrowRightIcon from '@/assets/icons/arrow-right.svg';
import ArrowLeftIcon from '@/assets/icons/arrow-left.svg';
import NoteBookPenIcon from '@/assets/icons/notebook-pen.svg';

// CONFIGURATION
// Replace this with your actual API URL (e.g., 'http://localhost:3000' or your production URL)
// The web app used relative paths ('/api/media'), but RN needs an absolute URL.

type Props = NativeStackScreenProps<RootStackParamList, 'Lesson'>;

const {width: screenWidth} = Dimensions.get('window');

const LessonScreen: React.FC<Props> = ({navigation, route}) => {
  const {lessonId, topicId, lessonTitle} = route.params;
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [videoUrl, setVideoUrl] = useState<string>('');

  const [dynamicContent, setDynamicContent] = useState<string>('');
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(false);

  // Custom Scrollbar Logic
  const [contentHeight, setContentHeight] = useState(0);
  const [scrollViewHeight, setScrollViewHeight] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;

  const [showNotes, setShowNotes] = useState<boolean>(false);
  // Ref no longer needed for saving from header
  const notesPanelRef = useRef<NotesPanelHandle>(null);

  // Use the quick record hook
  const {
    isRecording: isQuickRecording,
    recordingDuration,
    startRecording,
    stopRecording,
  } = useQuickRecord({
    topicId,
    lessonId,
    lessonTitle,
  });

  const currentSection: LessonSection | undefined = lesson?.sections[currentSectionIndex];
  const isFirstSection = currentSectionIndex === 0;
  const isLastSection = currentSectionIndex === (lesson?.sections?.length ?? 0) - 1;

  // Determine if this section is a video type
  const isVideoSection =
    currentSection?.type === 'video' || (currentSection?.fileType === 'video' && !!currentSection?.filePath);

  const loadLessonData = useCallback(async () => {
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
  }, [lessonId, navigation]);

  useEffect(() => {
    loadLessonData();
  }, [loadLessonData]);

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
    if ((section.type === 'markdown' || section.fileType === 'markdown') && section.filePath) {
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
        const topicsFileExists = await isFileOrFolderExists(_videoUrl);
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
        <NotesPanel ref={notesPanelRef} topicId={topicId} lessonId={lessonId} lessonTitle={lessonTitle} />
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
        <View style={styles.headerButtons}>
          {isQuickRecording ? (
            <TouchableOpacity style={styles.stopRecordingButton} onPress={stopRecording}>
              <Text style={styles.stopRecordingButtonText}>⏹ Stop ({formatDuration(recordingDuration)})</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.quickRecordButton} onPress={startRecording}>
              <Text style={styles.quickRecordButtonText}>🎤</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.notesButton} onPress={() => setShowNotes(true)}>
            <NoteBookPenIcon color="whit" width={16} height={16} />
            <Text style={styles.notesButtonText}>Notes</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Section Content */}
      <View style={styles.contentContainer}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollViewContent}
          showsVerticalScrollIndicator={false}
          onLayout={e => setScrollViewHeight(e.nativeEvent.layout.height)}
          onContentSizeChange={(_, height) => setContentHeight(height)}
          onScroll={Animated.event([{nativeEvent: {contentOffset: {y: scrollY}}}], {useNativeDriver: false})}
          scrollEventThrottle={16}>
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
              <ActivityIndicator size="small" color="#8b5cf6" style={{marginTop: 20}} />
            ) : (
              <Markdown style={markdownStyles}>{dynamicContent}</Markdown>
            )}
          </View>
        </ScrollView>
        {contentHeight > scrollViewHeight && (
          <View style={styles.customScrollbarTrack}>
            <Animated.View
              style={[
                styles.customScrollbarThumb,
                {
                  height: (scrollViewHeight / contentHeight) * scrollViewHeight,
                  transform: [
                    {
                      translateY: scrollY.interpolate({
                        inputRange: [0, contentHeight - scrollViewHeight],
                        outputRange: [0, scrollViewHeight - (scrollViewHeight / contentHeight) * scrollViewHeight],
                        extrapolate: 'clamp',
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        )}
      </View>

      {/* Navigation Controls */}
      {lesson?.sections?.length > 1 && (
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.navButton, isFirstSection && styles.navButtonHidden]}
            onPress={goToPreviousSection}
            disabled={isFirstSection}>
            <ArrowLeftIcon color="#ffffff" width={16} height={16} />
            <Text style={styles.navButtonText}> Previous</Text>
          </TouchableOpacity>

          <View style={styles.sectionIndicators}>
            {lesson.sections.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.sectionDot, index === currentSectionIndex && styles.sectionDotActive]}
                onPress={() => goToSection(index)}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.navButton, isLastSection && styles.navButtonHidden]}
            onPress={goToNextSection}
            disabled={isLastSection}>
            <Text style={styles.navButtonText}>Next</Text>
            <ArrowRightIcon color="#ffffff" width={16} height={16} />
          </TouchableOpacity>
        </View>
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
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
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
  notesTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  notesTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  quickRecordButton: {
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickRecordButtonText: {
    color: 'white',
    fontSize: 16,
  },
  stopRecordingButton: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  stopRecordingButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  notesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#8b5cf6',
  },
  notesButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  progressInfo: {
    flex: 1,
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
    flexWrap: 'wrap',
  },
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
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
    // width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    // flexWrap: 'wrap',
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  navButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  navButtonHidden: {
    opacity: 0,
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
  customScrollbarTrack: {
    position: 'absolute',
    right: 2,
    top: 2,
    bottom: 2,
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
  },
  customScrollbarThumb: {
    width: 6,
    backgroundColor: '#8b5cf6',
    borderRadius: 3,
  },
});

export default LessonScreen;
