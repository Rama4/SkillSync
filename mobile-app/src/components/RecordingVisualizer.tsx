import React, {useEffect, useRef} from 'react';
import {View, StyleSheet, Animated, Dimensions} from 'react-native';

interface RecordingVisualizerProps {
  isRecording: boolean;
  duration: number;
}

const {width: screenWidth} = Dimensions.get('window');
const VISUALIZER_WIDTH = screenWidth - 80;

const RecordingVisualizer: React.FC<RecordingVisualizerProps> = ({
  isRecording,
  duration,
}) => {
  const animatedValues = useRef(
    Array.from({length: 20}, () => new Animated.Value(0.2))
  ).current;
  
  const pulseAnimation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isRecording) {
      startVisualization();
    } else {
      stopVisualization();
    }

    return () => {
      stopVisualization();
    };
  }, [isRecording]);

  const startVisualization = () => {
    const createPulse = () => {
      const animations = animatedValues.map((animatedValue, index) => {
        return Animated.sequence([
          Animated.delay(index * 50),
          Animated.loop(
            Animated.sequence([
              Animated.timing(animatedValue, {
                toValue: Math.random() * 0.8 + 0.4,
                duration: 200 + Math.random() * 300,
                useNativeDriver: false,
              }),
              Animated.timing(animatedValue, {
                toValue: 0.2 + Math.random() * 0.3,
                duration: 200 + Math.random() * 300,
                useNativeDriver: false,
              }),
            ])
          ),
        ]);
      });

      pulseAnimation.current = Animated.parallel(animations);
      pulseAnimation.current.start();
    };

    createPulse();
  };

  const stopVisualization = () => {
    if (pulseAnimation.current) {
      pulseAnimation.current.stop();
    }
    
    // Reset all bars to minimum height
    const resetAnimations = animatedValues.map(animatedValue =>
      Animated.timing(animatedValue, {
        toValue: 0.2,
        duration: 300,
        useNativeDriver: false,
      })
    );
    
    Animated.parallel(resetAnimations).start();
  };

  const barWidth = (VISUALIZER_WIDTH - (animatedValues.length - 1) * 4) / animatedValues.length;

  return (
    <View style={styles.container}>
      <View style={styles.visualizer}>
        {animatedValues.map((animatedValue, index) => (
          <Animated.View
            key={index}
            style={[
              styles.bar,
              {
                width: barWidth,
                height: animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [4, 40],
                }),
                backgroundColor: isRecording ? '#ef4444' : '#374151',
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  visualizer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 50,
    width: VISUALIZER_WIDTH,
    justifyContent: 'space-between',
  },
  bar: {
    borderRadius: 2,
    marginHorizontal: 1,
  },
});

export default RecordingVisualizer;
