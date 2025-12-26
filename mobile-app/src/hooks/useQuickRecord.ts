import {useState, useEffect, useCallback} from 'react';
import {Alert} from 'react-native';
import {Note} from '../../../lib/types';
import {notesService} from '@/services/notesService';
import {audioRecorder} from '@/native/AudioRecorder';
import {isQuickNotesLesson} from '@/utils/quickNotesUtils';

interface UseQuickRecordOptions {
  topicId: string;
  lessonId: string;
  lessonTitle?: string;
  onRecordingComplete?: () => void;
  autoCreateQuickNotes?: boolean; // If true and lessonId is Quick Notes, ensure it exists
}

interface UseQuickRecordReturn {
  isRecording: boolean;
  recordingDuration: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
}

/**
 * Custom hook for quick audio recording functionality
 * Handles recording state, duration tracking, and saving audio notes
 */
export const useQuickRecord = ({
  topicId,
  lessonId,
  lessonTitle = '',
  onRecordingComplete,
  autoCreateQuickNotes = false,
}: UseQuickRecordOptions): UseQuickRecordReturn => {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingDuration, setRecordingDuration] = useState<number>(0);

  // Listen to recording progress
  useEffect(() => {
    if (isRecording) {
      const removeProgressListener = audioRecorder.onRecordingProgress(event => {
        setRecordingDuration(event.duration);
      });

      return () => {
        removeProgressListener();
      };
    }
  }, [isRecording]);

  const generateAudioNoteTitle = useCallback(
    (existingNotes: Note[]): string => {
      const audioNotes = existingNotes.filter(n => n.audioFile);
      const recordingNumber = audioNotes.length + 1;
      
      // Special handling for Quick Notes lessons
      if (isQuickNotesLesson(lessonId)) {
        return `Quick Note ${recordingNumber}`;
      }
      
      return lessonTitle ? `${lessonTitle} ${recordingNumber}` : `Recording ${recordingNumber}`;
    },
    [lessonId, lessonTitle],
  );

  const startRecording = useCallback(async () => {
    try {
      // Ensure Quick Notes lesson exists if needed
      if (autoCreateQuickNotes && isQuickNotesLesson(lessonId)) {
        const {getOrCreateQuickNotesLesson} = await import('@/utils/quickNotesUtils');
        await getOrCreateQuickNotesLesson(topicId);
      }

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
      } else {
        throw new Error('Failed to start recording');
      }
    } catch (error: any) {
      console.error('Error starting quick recording:', error);
      const errorMessage =
        error.message || 'Failed to start recording. Please check microphone permissions.';
      Alert.alert('Recording Error', errorMessage);
      setIsRecording(false);
      setRecordingDuration(0);
    }
  }, [topicId, lessonId, autoCreateQuickNotes]);

  const stopRecording = useCallback(async () => {
    if (!isRecording) {
      return;
    }

    try {
      const result = await audioRecorder.stopRecording();

      if (!result.success) {
        throw new Error('Failed to stop recording');
      }

      if (!result.filePath) {
        throw new Error('Recording file path not available');
      }

      // Ensure Quick Notes lesson exists if needed (in case it wasn't created during start)
      if (autoCreateQuickNotes && isQuickNotesLesson(lessonId)) {
        const {getOrCreateQuickNotesLesson} = await import('@/utils/quickNotesUtils');
        await getOrCreateQuickNotesLesson(topicId);
      }

      // Get existing notes to generate title
      const existingNotes = notesService.getNotes(topicId, lessonId);
      const generatedTitle = generateAudioNoteTitle(existingNotes);

      // Create note object with all required fields
      const newNote: Note = {
        id: `note_${Date.now()}`,
        lessonId,
        title: generatedTitle,
        markdown: '',
        audioFile: result.filePath,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save via notesService.saveNote()
      notesService.saveNote(topicId, lessonId, newNote);
      console.log('Quick recorded note saved:', newNote);

      // Call the completion callback if provided
      onRecordingComplete?.();

      // Only show success alert if callback doesn't handle it
      if (!onRecordingComplete) {
        Alert.alert('Success', 'Audio note saved successfully!');
      }
    } catch (error: any) {
      console.error('Error stopping quick recording:', error);
      const errorMessage = error.message || 'Failed to stop recording';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsRecording(false);
      setRecordingDuration(0);
    }
  }, [isRecording, topicId, lessonId, generateAudioNoteTitle, onRecordingComplete, autoCreateQuickNotes]);

  return {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
  };
};

