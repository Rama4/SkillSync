import React, {useState, useEffect, useCallback, useImperativeHandle, forwardRef} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView} from 'react-native';
import {Note} from '../../../lib/types';
import {notesService} from '../services/notesService';
import {audioRecorder} from '../native/AudioRecorder';
import AudioPlayer from './AudioPlayer';
import {formatDuration, getTempAudioFileName} from '../utils/noteUtils';
import CheckIcon from '@/assets/icons/circle-check.svg';
import CloseIcon from '@/assets/icons/circle-x.svg';

export interface NoteEditorHandle {
  saveNote: () => Promise<void>;
}

interface NoteEditorProps {
  note?: Note | null;
  topicId: string;
  lessonId?: string; // Optional for topic-level notes
  lessonTitle?: string;
  onSave: (note: Note) => void;
  onCancel: () => void;
  onCreateLesson?: (note: Note) => void; // Callback when lesson needs to be created
}

const NoteEditor = forwardRef<NoteEditorHandle, NoteEditorProps>(
  ({note, topicId, lessonId, lessonTitle = '', onSave, onCancel, onCreateLesson}, ref) => {
    const [title, setTitle] = useState<string>(note?.title || '');
    const [markdown, setMarkdown] = useState<string>(note?.markdown || '');
    const [isRecording, setIsRecording] = useState<boolean>(false);
    const [audioPath, setAudioPath] = useState<string | null>(note?.audioFile || null);
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [recordingDuration, setRecordingDuration] = useState<number>(0);

    const generateAudioNoteTitle = useCallback((): string => {
      // For topic-level notes, use a simple title
      if (!lessonId) {
        return getTempAudioFileName();
      }
      // For lesson-level notes, use the lesson title and recording number
      const existingNotes = notesService.getNotes(topicId, lessonId);
      const audioNotes = existingNotes.filter(n => n.audioFile);
      const recordingNumber = audioNotes.length + 1;
      return lessonTitle ? `${lessonTitle} ${recordingNumber}` : `Recording ${recordingNumber}`;
    }, [topicId, lessonId, lessonTitle]);

    const handleSave = useCallback(async () => {
      // Auto-generate title if empty but audio exists
      let finalTitle = title.trim();
      const hasAudio = audioPath || note?.audioFile;

      if (!finalTitle && hasAudio) {
        finalTitle = generateAudioNoteTitle();
      }

      if (!finalTitle) {
        Alert.alert('Missing Title', 'Please enter a title for your note');
        return;
      }

      try {
        // Create or update note
        const savedNote: Note = {
          id: note?.id || `note_${Date.now()}`,
          lessonId: lessonId || `temp-${Date.now()}`, // Use placeholder if no lessonId
          title: finalTitle,
          markdown: markdown.trim() || '',
          audioFile: audioPath || note?.audioFile,
          createdAt: note?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        // If no lessonId (topic-level note), trigger lesson creation callback
        if (!lessonId && onCreateLesson) {
          onCreateLesson(savedNote);
        } else if (lessonId) {
          // Save note normally if lessonId exists
          await notesService.saveNote(topicId, lessonId, savedNote);
          console.log('Note saved successfully:', savedNote);
        }

        onSave(savedNote);
      } catch (error) {
        console.error('Error saving note:', error);
        Alert.alert('Error', 'Failed to save note');
      }
    }, [title, markdown, audioPath, note, onCreateLesson, topicId, lessonId, onSave, generateAudioNoteTitle]);

    // Expose saveNote method to parent via ref
    useImperativeHandle(ref, () => ({
      saveNote: handleSave,
    }));

    useEffect(() => {
      // Set up event listeners
      const removeProgressListener = audioRecorder.onRecordingProgress(event => {
        setRecordingDuration(event.duration);
      });

      const removeCompleteListener = audioRecorder.onPlaybackComplete(() => {
        setIsPlaying(false);
      });

      const removeErrorListener = audioRecorder.onPlaybackError(event => {
        console.error('Playback error:', event);
        setIsPlaying(false);
        Alert.alert('Playback Error', 'Failed to play audio');
      });

      // Cleanup on unmount
      return () => {
        removeProgressListener();
        removeCompleteListener();
        removeErrorListener();

        // Stop any ongoing recording/playback
        audioRecorder.getStatus().then(status => {
          if (status.isRecording) {
            audioRecorder.cancelRecording();
          }
          if (status.isPlaying) {
            audioRecorder.stopPlayback();
          }
        });
      };
    }, []);

    const startRecording = useCallback(async () => {
      try {
        // Generate unique filename for the recording
        const filename = `note_${Date.now()}.m4a`;

        const result = await audioRecorder.startRecording({
          filename,
          sampleRate: 44100,
          bitRate: 128000,
          channels: 1,
        });

        if (result.success) {
          setIsRecording(true);
          setRecordingDuration(0);
        }
      } catch (error: any) {
        console.error('Error starting recording:', error);
        Alert.alert(
          'Recording Error',
          error.message || 'Failed to start recording. Please check microphone permissions.',
        );
      }
    }, []);

    const stopRecording = useCallback(async () => {
      if (!isRecording) {
        return;
      }

      try {
        const result = await audioRecorder.stopRecording();

        if (result.success && result.filePath) {
          setAudioPath(result.filePath);
        }

        setIsRecording(false);
        setRecordingDuration(0);
      } catch (error: any) {
        console.error('Error stopping recording:', error);
        Alert.alert('Error', error.message || 'Failed to stop recording');
        setIsRecording(false);
      }
    }, [isRecording]);

    const deleteAudio = useCallback(() => {
      Alert.alert('Delete Audio', 'Are you sure you want to delete the audio recording?', [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (isPlaying) {
              await audioRecorder.stopPlayback();
            }

            if (audioPath) {
              try {
                await audioRecorder.deleteFile(audioPath);
              } catch (error) {
                console.error('Error deleting audio file:', error);
              }
            }

            setAudioPath(null);
            setIsPlaying(false);
          },
        },
      ]);
    }, [audioPath, isPlaying]);

    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{note ? 'Edit Note' : 'New Note'}</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.headerSaveButton} onPress={handleSave}>
              <CheckIcon width={16} height={16} color="#ffffff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
              <CloseIcon width={16} height={16} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Note title"
              placeholderTextColor="#6b7280"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Content (Markdown)</Text>
            <TextInput
              multiline
              numberOfLines={4}
              style={styles.markdownInput}
              value={markdown}
              onChangeText={setMarkdown}
              placeholder="Write your notes in markdown format..."
              placeholderTextColor="#6b7280"
              textAlignVertical="top"
            />
          </View>

          <View style={styles.audioSection}>
            <Text style={styles.label}>Audio Recording</Text>

            {/* Audio Player */}
            {audioPath && !isRecording && (
              <View style={styles.audioPlayerContainer}>
                <AudioPlayer
                  filePath={audioPath}
                  onError={error => {
                    console.error('Audio player error:', error);
                    Alert.alert('Playback Error', error);
                  }}
                  onDelete={deleteAudio}
                />
              </View>
            )}

            {/* Recording Visualizer */}
            {isRecording && (
              <View style={styles.recordingContainer}>
                <View style={styles.recordingHeader}>
                  <View style={styles.recordingIndicator}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingText}>Recording: {formatDuration(recordingDuration)}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Recording Controls */}
            <View style={styles.recordingControls}>
              {!isRecording ? (
                <TouchableOpacity
                  style={[styles.recordButton, audioPath && styles.recordButtonSecondary]}
                  onPress={startRecording}>
                  <View style={styles.recordButtonContent}>
                    <View style={styles.micIcon}>
                      <Text style={styles.micIconText}>🎤</Text>
                    </View>
                    <Text style={styles.recordButtonText}>{audioPath ? 'Record New' : 'Start Recording'}</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={[styles.recordButton, styles.stopButton]} onPress={stopRecording}>
                  <View style={styles.recordButtonContent}>
                    <View style={styles.stopIcon}>
                      <Text style={styles.stopIconText}>⏹</Text>
                    </View>
                    <Text style={styles.recordButtonText}>Stop Recording</Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <CheckIcon width={16} height={16} color="#ffffff" />
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelActionButton} onPress={onCancel}>
              <CloseIcon width={16} height={16} color="#ffffff" />
              <Text style={styles.cancelActionButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  content: {
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  headerSaveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerSaveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 18,
    color: '#a1a1aa',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 8,
  },
  titleInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
  },
  markdownInput: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333333',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#ffffff',
    fontFamily: 'monospace',
    height: 100,
    textAlignVertical: 'top', // <--- Align text to top on Android
  },
  audioSection: {
    marginBottom: 20,
  },
  audioPlayerContainer: {
    marginBottom: 16,
  },
  deleteAudioButton: {
    backgroundColor: '#dc2626',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 12,
  },
  deleteAudioButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  recordingContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#dc2626',
  },
  recordingHeader: {
    marginBottom: 8,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#dc2626',
    marginRight: 8,
  },
  recordingText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  recordingControls: {
    alignItems: 'center',
  },
  recordButton: {
    width: '100%',
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  recordButtonSecondary: {
    backgroundColor: '#6366f1',
  },
  stopButton: {
    backgroundColor: '#dc2626',
    shadowColor: '#dc2626',
  },
  recordButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  micIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  micIconText: {
    fontSize: 12,
  },
  stopIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  stopIconText: {
    fontSize: 12,
  },
  recordButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  actions: {
    gap: 12,
  },
  saveButton: {
    backgroundColor: 'green',
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#6b7280',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelActionButton: {
    backgroundColor: '#374151',
    paddingVertical: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelActionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default NoteEditor;
