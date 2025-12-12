import {
  NativeModules,
  NativeEventEmitter,
  Platform,
  PermissionsAndroid,
} from 'react-native';

// Types for the native module
export interface RecordingOptions {
  filename?: string;
  outputDir?: string;
  sampleRate?: number;
  bitRate?: number;
  channels?: number;
}

export interface RecordingResult {
  success: boolean;
  filePath: string;
  duration?: number;
}

export interface RecorderStatus {
  isRecording: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  hasPlayer: boolean;
  currentFilePath: string | null;
  currentPlaybackPath: string | null;
  duration?: number;
}

export interface PlaybackResult {
  success: boolean;
  duration: number;
}

export interface FileInfo {
  filePath: string;
  size: number;
  duration: number;
  exists: boolean;
}

export interface RecordingProgressEvent {
  duration: number;
}

export interface PlaybackCompleteEvent {
  filePath: string;
}

export interface PlaybackErrorEvent {
  errorCode: number;
  errorExtra: number;
}

// Native module interface
interface AudioRecorderModuleType {
  checkPermission(): Promise<boolean>;
  getStatus(): Promise<RecorderStatus>;
  startRecording(options: RecordingOptions): Promise<RecordingResult>;
  stopRecording(): Promise<RecordingResult>;
  cancelRecording(): Promise<boolean>;
  startPlayback(filePath: string): Promise<PlaybackResult>;
  stopPlayback(): Promise<boolean>;
  pausePlayback(): Promise<boolean>;
  resumePlayback(): Promise<boolean>;
  seekToPosition(position: number): Promise<boolean>;
  getCurrentPosition(): Promise<number>;
  deleteFile(filePath: string): Promise<boolean>;
  getFileInfo(filePath: string): Promise<FileInfo>;
  addListener(eventName: string): void;
  removeListeners(count: number): void;
}

// Get the native module
const {AudioRecorderModule} = NativeModules as {
  AudioRecorderModule: AudioRecorderModuleType;
};

// Event emitter for native events
const eventEmitter = new NativeEventEmitter(NativeModules.AudioRecorderModule);

// Event subscription types
type RecordingProgressCallback = (event: RecordingProgressEvent) => void;
type PlaybackCompleteCallback = (event: PlaybackCompleteEvent) => void;
type PlaybackErrorCallback = (event: PlaybackErrorEvent) => void;

/**
 * AudioRecorder - A wrapper around the native AudioRecorderModule
 * Provides audio recording and playback functionality for Android
 */
class AudioRecorder {
  private progressListeners: RecordingProgressCallback[] = [];
  private completeListeners: PlaybackCompleteCallback[] = [];
  private errorListeners: PlaybackErrorCallback[] = [];
  private subscriptions: any[] = [];

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Recording progress events
    this.subscriptions.push(
      eventEmitter.addListener(
        'onRecordingProgress',
        (event: RecordingProgressEvent) => {
          this.progressListeners.forEach(listener => listener(event));
        },
      ),
    );

    // Playback complete events
    this.subscriptions.push(
      eventEmitter.addListener(
        'onPlaybackComplete',
        (event: PlaybackCompleteEvent) => {
          this.completeListeners.forEach(listener => listener(event));
        },
      ),
    );

    // Playback error events
    this.subscriptions.push(
      eventEmitter.addListener(
        'onPlaybackError',
        (event: PlaybackErrorEvent) => {
          this.errorListeners.forEach(listener => listener(event));
        },
      ),
    );
  }

  /**
   * Request RECORD_AUDIO permission from the user
   * @returns Promise<boolean> - true if permission granted
   */
  async requestPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      console.warn('AudioRecorder is only supported on Android');
      return false;
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message:
            'SkillSync needs access to your microphone to record voice notes.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'OK',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (err) {
      console.error('Permission request error:', err);
      return false;
    }
  }

  /**
   * Check if RECORD_AUDIO permission is already granted
   * @returns Promise<boolean>
   */
  async checkPermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }
    return AudioRecorderModule.checkPermission();
  }

  /**
   * Get the current status of the recorder
   * @returns Promise<RecorderStatus>
   */
  async getStatus(): Promise<RecorderStatus> {
    return AudioRecorderModule.getStatus();
  }

  /**
   * Start recording audio
   * @param options - Recording configuration options
   * @returns Promise<RecordingResult>
   */
  async startRecording(
    options: RecordingOptions = {},
  ): Promise<RecordingResult> {
    // Check permission first
    const hasPermission = await this.checkPermission();
    if (!hasPermission) {
      const granted = await this.requestPermission();
      if (!granted) {
        throw new Error('RECORD_AUDIO permission not granted');
      }
    }

    return AudioRecorderModule.startRecording(options);
  }

  /**
   * Stop recording and get the file path
   * @returns Promise<RecordingResult>
   */
  async stopRecording(): Promise<RecordingResult> {
    return AudioRecorderModule.stopRecording();
  }

  /**
   * Cancel recording and delete the file
   * @returns Promise<boolean>
   */
  async cancelRecording(): Promise<boolean> {
    return AudioRecorderModule.cancelRecording();
  }

  /**
   * Start playing an audio file
   * @param filePath - Path to the audio file
   * @returns Promise<PlaybackResult>
   */
  async startPlayback(filePath: string): Promise<PlaybackResult> {
    return AudioRecorderModule.startPlayback(filePath);
  }

  /**
   * Stop playback
   * @returns Promise<boolean>
   */
  async stopPlayback(): Promise<boolean> {
    return AudioRecorderModule.stopPlayback();
  }

  /**
   * Pause playback
   * @returns Promise<boolean>
   */
  async pausePlayback(): Promise<boolean> {
    return AudioRecorderModule.pausePlayback();
  }

  /**
   * Resume playback
   * @returns Promise<boolean>
   */
  async resumePlayback(): Promise<boolean> {
    return AudioRecorderModule.resumePlayback();
  }

  /**
   * Seek to a specific position in the audio
   * @param position - Position in milliseconds
   * @returns Promise<boolean>
   */
  async seekToPosition(position: number): Promise<boolean> {
    return AudioRecorderModule.seekToPosition(position);
  }

  /**
   * Get current playback position
   * @returns Promise<number> - Position in milliseconds
   */
  async getCurrentPosition(): Promise<number> {
    return AudioRecorderModule.getCurrentPosition();
  }

  /**
   * Delete an audio file
   * @param filePath - Path to the file to delete
   * @returns Promise<boolean>
   */
  async deleteFile(filePath: string): Promise<boolean> {
    return AudioRecorderModule.deleteFile(filePath);
  }

  /**
   * Get information about an audio file
   * @param filePath - Path to the audio file
   * @returns Promise<FileInfo>
   */
  async getFileInfo(filePath: string): Promise<FileInfo> {
    return AudioRecorderModule.getFileInfo(filePath);
  }

  /**
   * Add listener for recording progress events
   * @param callback - Function called with duration updates
   * @returns Function to remove the listener
   */
  onRecordingProgress(callback: RecordingProgressCallback): () => void {
    this.progressListeners.push(callback);
    return () => {
      const index = this.progressListeners.indexOf(callback);
      if (index > -1) {
        this.progressListeners.splice(index, 1);
      }
    };
  }

  /**
   * Add listener for playback complete events
   * @param callback - Function called when playback completes
   * @returns Function to remove the listener
   */
  onPlaybackComplete(callback: PlaybackCompleteCallback): () => void {
    this.completeListeners.push(callback);
    return () => {
      const index = this.completeListeners.indexOf(callback);
      if (index > -1) {
        this.completeListeners.splice(index, 1);
      }
    };
  }

  /**
   * Add listener for playback error events
   * @param callback - Function called on playback errors
   * @returns Function to remove the listener
   */
  onPlaybackError(callback: PlaybackErrorCallback): () => void {
    this.errorListeners.push(callback);
    return () => {
      const index = this.errorListeners.indexOf(callback);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  /**
   * Clean up all event listeners
   */
  cleanup() {
    this.subscriptions.forEach(sub => sub.remove());
    this.subscriptions = [];
    this.progressListeners = [];
    this.completeListeners = [];
    this.errorListeners = [];
  }
}

// Export singleton instance
export const audioRecorder = new AudioRecorder();

// Also export the class for testing
export default AudioRecorder;
