import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Slider from '@react-native-community/slider';
import Sound from 'react-native-sound';

// Set Sound category for iOS (optional but recommended for playback)
Sound.setCategory('Playback');

interface AudioPlayerProps {
  filePath: string;
  onError?: (error: string) => void;
  style?: any;
}

const {width: screenWidth} = Dimensions.get('window');
const PLAYER_WIDTH = screenWidth - 40;

const AudioPlayer: React.FC<AudioPlayerProps> = ({
  filePath,
  onError,
  style,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0); // Duration in seconds
  const [currentTime, setCurrentTime] = useState(0); // Current time in seconds
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);

  const animatedValue = useRef(new Animated.Value(0)).current;
  const progressInterval = useRef<NodeJS.Timeout | null>(null);
  const soundRef = useRef<Sound | null>(null);

  const stopProgressTracking = useCallback(() => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }, []);

  // --- AUDIO INITIALIZATION AND CLEANUP ---
  useEffect(() => {
    setIsLoading(true);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    stopProgressTracking();

    const newSound = new Sound(filePath, '', error => {
      if (error) {
        console.error('Failed to load the sound', error);
        onError?.(`Failed to load audio: ${error.message}`);
        setIsLoading(false);
        return;
      }

      // successfully loaded
      soundRef.current = newSound;
      setDuration(newSound.getDuration()); // Duration is in seconds
      setIsLoading(false);
    });

    return () => {
      if (soundRef.current) {
        soundRef.current.release();
        soundRef.current = null;
      }
      stopProgressTracking();
    };
  }, [filePath, onError, stopProgressTracking]);

  // --- PROGRESS TRACKING ---
  const startProgressTracking = useCallback(() => {
    stopProgressTracking();

    progressInterval.current = setInterval(() => {
      if (soundRef.current && !isSeeking) {
        soundRef.current.getCurrentTime(seconds => {
          setCurrentTime(seconds); // Time is in seconds

          // Check for end of playback
          if (seconds >= duration - 0.2 && duration > 0) {
            setIsPlaying(false);
            setCurrentTime(0);
            stopProgressTracking();
            soundRef.current?.setCurrentTime(0); // Reset for next play
          }
        });
      }
    }, 250);
  }, [isSeeking, duration, stopProgressTracking]);

  // Update tracking when isPlaying state changes
  useEffect(() => {
    if (isPlaying) {
      startProgressTracking();
    } else {
      stopProgressTracking();
    }
    // Note: Dependencies here exclude soundRef and duration because those only change on load.
  }, [isPlaying, startProgressTracking, stopProgressTracking]);

  // --- TIME FORMATTING ---
  const formatTime = (seconds: number): string => {
    const totalSeconds = Math.floor(seconds);
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (totalSeconds < 0) return '0:00';
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- PLAYBACK CONTROL ---
  const handlePlayPause = () => {
    if (isLoading || !soundRef.current || duration <= 0) return;

    if (isPlaying) {
      soundRef.current.pause(() => {
        setIsPlaying(false);
      });
    } else {
      // If at end, seek back to start
      if (currentTime >= duration) {
        soundRef.current.setCurrentTime(0);
        setCurrentTime(0);
      }

      soundRef.current.play(success => {
        if (!success) {
          console.error('Playback failed due to native error');
          onError?.('Playback failed');
        }
        // Note: The `play` callback only runs on completion/error,
        // we handle state change immediately below for responsiveness.
      });

      setIsPlaying(true);

      // Animate play button
      Animated.spring(animatedValue, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  };

  // --- SEEKING LOGIC ---
  const handleSlidingStart = () => {
    // Pause tracking when user starts dragging the slider
    setIsSeeking(true);
  };

  const handleSlidingComplete = (value: number) => {
    if (!soundRef.current) return;

    // 1. Set the new position in the audio file (in seconds)
    soundRef.current.setCurrentTime(value);

    // 2. Update the UI state
    setCurrentTime(value);

    // 3. Resume tracking
    setIsSeeking(false);
  };

  const handleValueChange = (value: number) => {
    // Update the UI state while dragging
    setCurrentTime(value);
  };

  // --- UI RENDER LOGIC ---
  const playButtonScale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });

  return (
    <View style={[styles.container, style]}>
      <View style={styles.playerContainer}>
        {/* Play/Pause Button */}
        <Animated.View style={{transform: [{scale: playButtonScale}]}}>
          <TouchableOpacity
            style={[
              styles.playButton,
              isPlaying && styles.playButtonActive,
              isLoading && styles.playButtonLoading,
            ]}
            onPress={handlePlayPause}
            disabled={isLoading || duration === 0}>
            {isLoading ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.playButtonText}>
                {isPlaying ? '⏸' : '▶️'}
              </Text>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Controls */}
        <View style={styles.controlsContainer}>
          {/* 🎧 Progress Slider (Placeholder - Requires an external component for full functionality) */}
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={duration}
            value={currentTime}
            onSlidingStart={handleSlidingStart}
            onSlidingComplete={handleSlidingComplete}
            onValueChange={handleValueChange}
            minimumTrackTintColor="#8b5cf6"
            maximumTrackTintColor="#374151"
            disabled={duration === 0 || isLoading}
          />

          {/* Time Display */}
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>
      </View>

      {/* Speed Control */}
      <View style={styles.speedContainer}>
        <TouchableOpacity
          style={styles.speedButton}
          disabled={!soundRef.current}
          onPress={() => {
            // Note: Implementation for setSpeed is similar to setCurrentTime
            const newSpeed = soundRef.current?.getSpeed() === 1.0 ? 1.5 : 1.0;
            soundRef.current?.setSpeed(newSpeed);
            // You would also need state to track the current speed
          }}>
          <Text style={styles.speedButtonText}>1x</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333333',
  },
  playerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    elevation: 3,
    shadowColor: '#8b5cf6',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  playButtonActive: {
    backgroundColor: '#7c3aed',
  },
  playButtonLoading: {
    backgroundColor: '#6b7280',
  },
  playButtonText: {
    fontSize: 18,
    color: '#ffffff',
  },
  controlsContainer: {
    flex: 1,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 12,
    color: '#a1a1aa',
    fontFamily: 'monospace',
  },
  // --- SLIDER STYLES (Placeholder styles) ---
  slider: {
    width: '100%',
    height: 40, // Increased height for better touch area on the mock slider
    marginBottom: -10,
  },
  sliderThumb: {
    backgroundColor: '#8b5cf6',
    width: 16,
    height: 16,
  },
  sliderTrack: {
    height: 3,
    borderRadius: 1.5,
  },
  // ------------------------------------------
  speedContainer: {
    alignItems: 'flex-end',
  },
  speedButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#374151',
    borderRadius: 12,
  },
  speedButtonText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '500',
  },
});

export default AudioPlayer;
