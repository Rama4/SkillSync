import React, {useState, useEffect, useCallback, useRef} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Slider from '@react-native-community/slider';
import {useDebouncedCallback} from 'use-debounce';
import TrashIcon from '@/assets/icons/trash.svg';
import PauseIcon from '@/assets/icons/media-pause.svg';
import PlayIcon from '@/assets/icons/media-play.svg';
import {audioRecorder} from '@/native/AudioRecorder';
import {formatDuration} from '@/utils/noteUtils';

interface AudioPlayerProps {
  filePath: string;
  onError?: (error: string) => void;
  style?: any;
  onDelete?: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({filePath, onError, style, onDelete}) => {
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSeeking, setIsSeeking] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const filePathRef = useRef<string>(filePath);

  // Clear timer helper
  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Start progress timer
  const startProgressTimer = useCallback(() => {
    clearTimer();
    timerRef.current = setInterval(async () => {
      if (!isSeeking) {
        try {
          const position = await audioRecorder.getCurrentPosition();
          const positionInSeconds = position / 1000;
          setCurrentTime(positionInSeconds);
        } catch {
          // Player might be released, ignore
        }
      }
    }, 200);
  }, [isSeeking, clearTimer]);

  // Load audio file info on mount
  useEffect(() => {
    filePathRef.current = filePath;

    const loadAudio = async () => {
      try {
        const fileInfo = await audioRecorder.getFileInfo(filePath);
        setDuration(fileInfo.duration / 1000); // Convert ms to seconds
        setIsLoading(false);
      } catch (error) {
        console.error('Failed to load audio:', error);
        onError?.('Failed to load audio file');
        setIsLoading(false);
      }
    };

    loadAudio();

    // Setup playback complete listener
    const removeCompleteListener = audioRecorder.onPlaybackComplete(() => {
      setIsPlaying(false);
      setCurrentTime(0);
      clearTimer();
    });

    // Setup playback error listener
    const removeErrorListener = audioRecorder.onPlaybackError(event => {
      console.error('Playback error:', event);
      setIsPlaying(false);
      onError?.('Playback error occurred');
      clearTimer();
    });

    // Cleanup on unmount
    return () => {
      removeCompleteListener();
      removeErrorListener();
      clearTimer();
      // Stop playback if component unmounts
      audioRecorder.stopPlayback().catch(() => {});
    };
  }, [filePath, onError, clearTimer]);

  // Handle play/pause button (debounced to prevent rapid double-taps)
  const onPlayPause = useDebouncedCallback(
    async () => {
      if (isLoading) {
        return;
      }

      try {
        if (isPlaying) {
          // Currently playing -> Pause
          await audioRecorder.pausePlayback();
          setIsPlaying(false);
          clearTimer();
        } else {
          // Not playing -> Either resume or start fresh
          const status = await audioRecorder.getStatus();

          if (status.hasPlayer && status.currentPlaybackPath === filePathRef.current) {
            // Player exists for this file -> Resume
            await audioRecorder.resumePlayback();
          } else {
            // No player or different file -> Start fresh
            await audioRecorder.startPlayback(filePathRef.current);
            setCurrentTime(0);
          }

          setIsPlaying(true);
          startProgressTimer();
        }
      } catch (error) {
        console.error('Playback error:', error);
        onError?.('Playback failed');
        setIsPlaying(false);
        clearTimer();
      }
    },
    300,
    {leading: true, trailing: false},
  );

  // Slider value change (while dragging) - just update UI
  const onSliderValueChange = useCallback((value: number) => {
    setCurrentTime(value);
  }, []);

  // Slider drag start
  const onSlidingStart = useCallback(() => {
    setIsSeeking(true);
  }, []);

  // Slider drag complete - perform actual seek (debounced to prevent rapid seek calls)
  const onSlidingComplete = useDebouncedCallback(
    async (value: number) => {
      setCurrentTime(value);

      try {
        const status = await audioRecorder.getStatus();

        if (status.hasPlayer) {
          // Player exists -> seek directly
          const positionMs = Math.floor(value * 1000);
          await audioRecorder.seekToPosition(positionMs);
        } else {
          // No player -> start playback then seek, then pause
          await audioRecorder.startPlayback(filePathRef.current);

          // Wait a bit for player to be ready, then seek
          setTimeout(async () => {
            try {
              const positionMs = Math.floor(value * 1000);
              await audioRecorder.seekToPosition(positionMs);
              // Pause immediately after seeking if user just tapped
              await audioRecorder.pausePlayback();
              setIsPlaying(false);
            } catch (seekError) {
              console.error('❌ [SEEK] Seek after start error:', seekError);
            }
          }, 100);
        }
      } catch (seekError) {
        console.error('❌ [SEEK] Seek error:', seekError);
      } finally {
        setIsSeeking(false);
      }
    },
    200,
    {leading: true, trailing: false},
  );

  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.loadingText}>Loading audio...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Compact Single-Line Layout */}
      <View style={styles.compactRow}>
        {/* Play/Pause Button */}
        <TouchableOpacity style={styles.compactButton} onPress={onPlayPause} disabled={isLoading}>
          {isPlaying ? (
            <PauseIcon width={16} height={16} color="white" />
          ) : (
            <PlayIcon width={16} height={16} color="white" />
          )}
        </TouchableOpacity>

        {/* Slider */}
        <View style={styles.compactSliderContainer}>
          <Slider
            style={styles.compactSlider}
            value={currentTime}
            minimumValue={0}
            maximumValue={duration}
            onValueChange={onSliderValueChange}
            onSlidingStart={onSlidingStart}
            onSlidingComplete={onSlidingComplete}
            minimumTrackTintColor="#8b5cf6"
            maximumTrackTintColor="#374151"
            thumbTintColor="#8b5cf6"
            disabled={isLoading || duration === 0}
          />
        </View>

        {/* Time Display */}
        <Text style={styles.compactTimeText}>
          {formatDuration(currentTime)} / {formatDuration(duration)}
        </Text>

        {/* Delete Button */}
        {onDelete && (
          <TouchableOpacity style={styles.compactDeleteButton} onPress={onDelete} disabled={isLoading}>
            <TrashIcon width={16} height={16} color="white" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    // padding: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  loadingText: {
    color: '#a1a1aa',
    fontSize: 14,
    textAlign: 'center',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#8b5cf6',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  compactButtonText: {
    fontSize: 14,
  },
  compactSliderContainer: {
    flex: 1,
    paddingHorizontal: 4,
  },
  compactSlider: {
    width: '100%',
    height: 30,
  },
  compactTimeText: {
    color: '#a1a1aa',
    fontSize: 11,
    fontFamily: 'monospace',
    minWidth: 60,
    textAlign: 'right',
  },
  compactDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#dc2626',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#dc2626',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
});

export default AudioPlayer;
