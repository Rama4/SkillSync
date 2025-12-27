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
  TextInput,
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
import {saveLessonToFileSystem} from '@/utils/lessonUtils';
import {createTopicFolderStructure} from '@/utils/topicUtils';
import ArrowRightIcon from '@/assets/icons/arrow-right.svg';
import ArrowLeftIcon from '@/assets/icons/arrow-left.svg';
import NoteBookPenIcon from '@/assets/icons/notebook-pen.svg';
import PlusIcon from '@/assets/icons/plus.svg';

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
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [editingLessonTitle, setEditingLessonTitle] = useState<string>('');
  const [editingSections, setEditingSections] = useState<LessonSection[]>([]);

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

  // Use editing sections in edit mode, otherwise use lesson sections
  const displaySections = isEditMode ? editingSections : lesson?.sections || [];
  const currentSection: LessonSection | undefined = displaySections[currentSectionIndex];
  const isFirstSection = currentSectionIndex === 0;
  const isLastSection = currentSectionIndex === (displaySections.length ?? 0) - 1;

  // Determine if this section is a video type
  const isVideoSection =
    currentSection?.type === 'video' || (currentSection?.fileType === 'video' && !!currentSection?.filePath);

  const loadLessonData = useCallback(async () => {
    try {
      setIsLoading(true);
      const lessonData = await databaseService.getLesson(lessonId);
      if (lessonData) {
        setLesson(lessonData);
        setEditingLessonTitle(lessonData.title);
        setEditingSections([...lessonData.sections]);
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
    if (!lesson?.sections?.length) {
      return;
    }

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

  const handleToggleEditMode = useCallback(() => {
    if (isEditMode) {
      // Exiting edit mode - cancel all edits
      if (lesson) {
        setEditingLessonTitle(lesson.title);
        setEditingSections([...lesson.sections]);
      }
    } else {
      // Entering edit mode - initialize editing state
      if (lesson) {
        setEditingLessonTitle(lesson.title);
        setEditingSections([...lesson.sections]);
      }
    }
    setIsEditMode(!isEditMode);
  }, [isEditMode, lesson]);

  const handleSaveAllChanges = useCallback(async () => {
    if (!lesson) return;

    try {
      const trimmedTitle = editingLessonTitle.trim();
      if (!trimmedTitle) {
        Alert.alert('Error', 'Lesson title cannot be empty');
        return;
      }

      // Update lesson with all changes
      const updatedLesson: Lesson = {
        ...lesson,
        title: trimmedTitle,
        sections: editingSections,
        lastUpdated: new Date().toISOString().split('T')[0],
      };

      // Save to database
      await databaseService.saveLesson(updatedLesson);

      // Save to file system
      await saveLessonToFileSystem(updatedLesson);

      // Update topic metadata if title changed
      if (trimmedTitle !== lesson.title) {
        const topic = await databaseService.getTopic(topicId);
        if (topic) {
          const updatedLessons = topic.lessons.map(l =>
            l.id === lessonId
              ? {
                  ...l,
                  title: trimmedTitle,
                }
              : l,
          );
          const updatedTopic = {
            ...topic,
            lessons: updatedLessons,
            lastUpdated: new Date().toISOString().split('T')[0],
          };
          await databaseService.saveTopic(updatedTopic);
          await createTopicFolderStructure(updatedTopic);
        }
      }

      // Update local state
      setLesson(updatedLesson);

      // Update navigation header title
      navigation.setOptions({
        title: trimmedTitle,
      });

      // Reset current section index if it's out of bounds
      if (currentSectionIndex >= editingSections.length) {
        setCurrentSectionIndex(Math.max(0, editingSections.length - 1));
      }

      setIsEditMode(false);
      Alert.alert('Success', 'Lesson updated successfully');
    } catch (error) {
      console.error('Failed to save lesson changes:', error);
      Alert.alert('Error', 'Failed to save changes');
    }
  }, [lesson, editingLessonTitle, editingSections, topicId, lessonId, currentSectionIndex, navigation]);

  const handleCancelEdit = useCallback(() => {
    if (lesson) {
      setEditingLessonTitle(lesson.title);
      setEditingSections([...lesson.sections]);
    }
    setIsEditMode(false);
  }, [lesson]);

  const handleSectionTitleChange = useCallback((sectionId: string, newTitle: string) => {
    setEditingSections(prev =>
      prev.map(section => (section?.id === sectionId ? {...section, title: newTitle} : section)),
    );
  }, []);

  const handleSectionContentChange = useCallback((sectionId: string, newContent: string) => {
    setEditingSections(prev =>
      prev.map(section => (section?.id === sectionId ? {...section, content: newContent} : section)),
    );
  }, []);

  const handleDeleteSection = useCallback(
    (sectionId: string) => {
      Alert.alert('Delete Section', 'Are you sure you want to delete this section?', [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const newSections = editingSections.filter(s => s?.id !== sectionId);
            setEditingSections(newSections);
            // Adjust current section index if needed
            if (currentSectionIndex >= newSections?.length) {
              setCurrentSectionIndex(Math.max(0, newSections?.length - 1));
            }
          },
        },
      ]);
    },
    [editingSections, currentSectionIndex],
  );

  const handleAddSection = useCallback(() => {
    const newSection: LessonSection = {
      id: `section-${Date.now()}`,
      type: 'content',
      title: 'New Section',
      content: '',
    };
    setEditingSections(prev => [...prev, newSection]);
    setCurrentSectionIndex(editingSections.length); // Navigate to new section
  }, [editingSections.length]);

  const markdownStyles: any = {
    body: {color: '#ffffff', fontSize: 16, lineHeight: 24},
    heading1: {
      color: '#ffffff',
      fontSize: 24,
      fontWeight: 'bold' as const,
      marginBottom: 16,
      marginTop: 20,
    },
    heading2: {
      color: '#ffffff',
      fontSize: 20,
      fontWeight: '600' as const,
      marginBottom: 12,
      marginTop: 16,
    },
    heading3: {
      color: '#ffffff',
      fontSize: 18,
      fontWeight: '600' as const,
      marginBottom: 8,
      marginTop: 12,
    },
    paragraph: {
      color: '#e5e5e5',
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 12,
    },
    strong: {color: '#ffffff', fontWeight: 'bold' as const},
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
      fontWeight: 'bold' as const,
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
          {isEditMode ? (
            <TextInput
              style={styles.lessonTitleInput}
              value={editingLessonTitle}
              onChangeText={setEditingLessonTitle}
              placeholder="Lesson title"
              placeholderTextColor="#6b7280"
            />
          ) : (
            <>
              <Text style={styles.progressText}>
                {currentSectionIndex + 1} of {displaySections.length}
              </Text>
              <Text style={styles.sectionTitle}>{currentSection?.title}</Text>
            </>
          )}
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
              <TouchableOpacity style={styles.editButton} onPress={handleToggleEditMode}>
                <Text style={styles.editButtonText}>✏️</Text>
              </TouchableOpacity>
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
                <NoteBookPenIcon color="white" width={16} height={16} />
                <Text style={styles.notesButtonText}>Notes</Text>
              </TouchableOpacity>
            </>
          )}
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
          {isEditMode ? (
            // Edit Mode: Show all sections as editable
            <View>
              {editingSections.map(section => {
                if (!section) {
                  return null;
                } else {
                  return (
                    <View key={section.id} style={styles.sectionEditCard}>
                      <View style={styles.sectionEditHeader}>
                        <TextInput
                          style={styles.sectionTitleInput}
                          value={section.title}
                          onChangeText={newTitle => handleSectionTitleChange(section.id, newTitle)}
                          placeholder="Section title"
                          placeholderTextColor="#6b7280"
                        />
                        <TouchableOpacity
                          style={styles.deleteSectionButton}
                          onPress={() => handleDeleteSection(section.id)}
                          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
                          <Text style={styles.deleteSectionButtonText}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                      {(section.type === 'content' || section.type === 'markdown') && (
                        <TextInput
                          style={styles.sectionContentInput}
                          value={section.content || ''}
                          onChangeText={newContent => handleSectionContentChange(section.id, newContent)}
                          placeholder="Section content (markdown supported)"
                          placeholderTextColor="#6b7280"
                          multiline
                          textAlignVertical="top"
                        />
                      )}
                      {section.type === 'file' && section.filePath && (
                        <Text style={styles.filePathText}>File: {section.filePath}</Text>
                      )}
                    </View>
                  );
                }
              })}
              <TouchableOpacity style={styles.addSectionButton} onPress={handleAddSection}>
                <PlusIcon color="white" width={20} height={20} />
                <Text style={styles.addSectionButtonText}>Add Section</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // View Mode: Show current section
            <View style={styles.flashCard}>
              <Text style={styles.flashCardTitle}>{currentSection?.title}</Text>

              {/* Video Player Section */}
              {isVideoSection && videoUrl && (
                <View style={styles.videoContainer}>
                  <Video
                    source={{uri: videoUrl}}
                    style={styles.videoPlayer}
                    controls={true}
                    resizeMode="contain"
                    paused={true}
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
          )}
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
      {!isEditMode && displaySections.length > 1 && (
        <View style={styles.navigationContainer}>
          <TouchableOpacity
            style={[styles.navButton, isFirstSection && styles.navButtonHidden]}
            onPress={goToPreviousSection}
            disabled={isFirstSection}>
            <ArrowLeftIcon color="#ffffff" width={16} height={16} />
            <Text style={styles.navButtonText}> Previous</Text>
          </TouchableOpacity>

          <View style={styles.sectionIndicators}>
            {displaySections.map((_, index) => (
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
    marginBottom: 4,
  },
  editButton: {
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    paddingVertical: 10,
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
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionEditCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  sectionEditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  sectionTitleInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#8b5cf6',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  deleteSectionButton: {
    padding: 8,
  },
  deleteSectionButtonText: {
    fontSize: 20,
  },
  sectionContentInput: {
    fontSize: 16,
    color: 'white',
    backgroundColor: '#0a0a0a',
    borderWidth: 1,
    borderColor: '#8b5cf6',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 150,
    textAlignVertical: 'top',
  },
  filePathText: {
    fontSize: 14,
    color: '#a1a1aa',
    fontStyle: 'italic',
    marginTop: 8,
  },
  addSectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#8b5cf6',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  addSectionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default LessonScreen;
