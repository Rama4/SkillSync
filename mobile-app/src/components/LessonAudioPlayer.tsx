import React, {useCallback, useEffect, useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ActivityIndicator} from 'react-native';
import Slider from '@react-native-community/slider';
import {State, usePlaybackState, useProgress} from 'react-native-track-player';
import {Lesson, LessonAudioManifest} from '../../../lib/types';
import {loadLessonTrack, setupTrackPlayer, TrackPlayer} from '@/services/trackPlayer';
import {resolveLessonAudio} from '@/utils/lessonAudioUtils';
import {offlineTts} from '@/services/offlineTts';
import {formatDuration} from '@/utils/noteUtils';
import PlayIcon from '@/assets/icons/media-play.svg';
import PauseIcon from '@/assets/icons/media-pause.svg';

interface LessonAudioPlayerProps {
  topicId: string;
  lessonId: string;
  lessonTitle: string;
  // Used for the on-device TTS fallback when no narration audio is available.
  lesson?: Lesson | null;
  style?: any;
}

const RATES = [0.75, 1, 1.25, 1.5, 2];

const LessonAudioPlayer: React.FC<LessonAudioPlayerProps> = ({
  topicId,
  lessonId,
  lessonTitle,
  lesson,
  style,
}) => {
  const [manifest, setManifest] = useState<LessonAudioManifest | null>(null);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [rate, setRate] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [ttsMode, setTtsMode] = useState(false);

  const playbackState = usePlaybackState();
  const {position, duration} = useProgress(250);
  const isPlaying = playbackState.state === State.Playing;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const resolved = await resolveLessonAudio(topicId, lessonId);
      if (cancelled) return;
      if (resolved) {
        setManifest(resolved.manifest);
        await loadLessonTrack({
          id: `${topicId}:${lessonId}`,
          url: resolved.fullUri,
          title: lessonTitle,
          artist: 'SkillSync',
          album: 'Lesson narration',
          duration: resolved.manifest.duration,
        });
        setLoaded(true);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
      // Stop narration when leaving the lesson.
      setupTrackPlayer().then(() => TrackPlayer.reset().catch(() => {}));
      offlineTts.stop();
    };
  }, [topicId, lessonId, lessonTitle]);

  const chapters = manifest?.chapters ?? [];
  const activeChapterIndex = (() => {
    if (chapters.length === 0) return -1;
    let idx = 0;
    for (let i = 0; i < chapters.length; i++) {
      if (position >= chapters[i].start) idx = i;
    }
    return idx;
  })();

  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      await TrackPlayer.pause();
    } else {
      await TrackPlayer.play();
    }
  }, [isPlaying]);

  const seekToChapter = useCallback(
    (index: number) => {
      const chapter = chapters[index];
      if (chapter) TrackPlayer.seekTo(chapter.start);
    },
    [chapters],
  );

  const cycleRate = useCallback(async () => {
    const next = RATES[(RATES.indexOf(rate) + 1) % RATES.length];
    setRate(next);
    await TrackPlayer.setRate(next);
  }, [rate]);

  const startOfflineTts = useCallback(() => {
    if (!lesson) return;
    setTtsMode(true);
    offlineTts.speakLesson(lesson);
  }, [lesson]);

  if (loading) {
    return (
      <View style={[styles.container, style]}>
        <ActivityIndicator color="#8b5cf6" />
      </View>
    );
  }

  // No generated narration: offer an on-device voice fallback when offline.
  if (!loaded) {
    if (!lesson) return null;
    return (
      <View style={[styles.container, style]}>
        <TouchableOpacity style={styles.ttsRow} onPress={ttsMode ? () => offlineTts.stop() : startOfflineTts}>
          <View style={styles.playButton}>
            {ttsMode ? (
              <PauseIcon width={16} height={16} color="white" />
            ) : (
              <PlayIcon width={16} height={16} color="white" />
            )}
          </View>
          <Text style={styles.title}>{ttsMode ? 'Stop' : 'Listen (device voice)'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const activeChapter = chapters[activeChapterIndex];

  return (
    <View style={[styles.container, style]}>
      <View style={styles.row}>
        <TouchableOpacity style={styles.playButton} onPress={togglePlay}>
          {isPlaying ? (
            <PauseIcon width={18} height={18} color="white" />
          ) : (
            <PlayIcon width={18} height={18} color="white" />
          )}
        </TouchableOpacity>

        <View style={styles.middle}>
          <Text style={styles.title} numberOfLines={1}>
            {activeChapter ? activeChapter.title : 'Listen to this lesson'}
          </Text>
          <Slider
            style={styles.slider}
            value={position}
            minimumValue={0}
            maximumValue={duration || manifest?.duration || 0}
            onSlidingComplete={value => TrackPlayer.seekTo(value)}
            minimumTrackTintColor="#8b5cf6"
            maximumTrackTintColor="#374151"
            thumbTintColor="#8b5cf6"
          />
          <View style={styles.timeRow}>
            <Text style={styles.time}>{formatDuration(position)}</Text>
            <Text style={styles.time}>{formatDuration(duration || manifest?.duration || 0)}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.rateButton} onPress={cycleRate}>
          <Text style={styles.rateText}>{rate}x</Text>
        </TouchableOpacity>
      </View>

      {chapters.length > 1 && (
        <View style={styles.chapterControls}>
          <TouchableOpacity
            onPress={() => seekToChapter(Math.max(activeChapterIndex - 1, 0))}
            style={styles.chapterNav}>
            <Text style={styles.chapterNavText}>Prev</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.chapterNav}>
            <Text style={styles.chapterNavText}>
              {expanded ? 'Hide' : `${chapters.length} chapters`}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => seekToChapter(Math.min(activeChapterIndex + 1, chapters.length - 1))}
            style={styles.chapterNav}>
            <Text style={styles.chapterNavText}>Next</Text>
          </TouchableOpacity>
        </View>
      )}

      {expanded &&
        chapters.map((chapter, index) => (
          <TouchableOpacity
            key={chapter.sectionId}
            style={[styles.chapterItem, index === activeChapterIndex && styles.chapterItemActive]}
            onPress={() => {
              seekToChapter(index);
              TrackPlayer.play();
            }}>
            <Text
              style={[styles.chapterText, index === activeChapterIndex && styles.chapterTextActive]}
              numberOfLines={1}>
              {index + 1}. {chapter.title}
            </Text>
            <Text style={styles.chapterTime}>{formatDuration(chapter.start)}</Text>
          </TouchableOpacity>
        ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3b2f63',
    padding: 10,
  },
  row: {flexDirection: 'row', alignItems: 'center', gap: 10},
  ttsRow: {flexDirection: 'row', alignItems: 'center', gap: 10},
  middle: {flex: 1},
  playButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {color: '#e5e7eb', fontSize: 13, fontWeight: '600'},
  slider: {width: '100%', height: 28},
  timeRow: {flexDirection: 'row', justifyContent: 'space-between'},
  time: {color: '#9ca3af', fontSize: 10, fontFamily: 'monospace'},
  rateButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#2a2a2a',
  },
  rateText: {color: '#d1d5db', fontSize: 11, fontFamily: 'monospace'},
  chapterControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  chapterNav: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
  },
  chapterNavText: {color: '#d1d5db', fontSize: 12},
  chapterItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  chapterItemActive: {backgroundColor: 'rgba(139,92,246,0.15)'},
  chapterText: {color: '#9ca3af', fontSize: 12, flex: 1},
  chapterTextActive: {color: '#c4b5fd'},
  chapterTime: {color: '#6b7280', fontSize: 10, fontFamily: 'monospace', marginLeft: 8},
});

export default LessonAudioPlayer;
