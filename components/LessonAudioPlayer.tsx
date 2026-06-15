'use client';

import {useEffect, useRef, useState} from 'react';
import {Play, Pause, SkipBack, SkipForward, Headphones, X} from 'lucide-react';
import type {LessonAudioManifest} from '@/lib/types';
import {formatDuration} from '@/lib/noteUtils';
import {PLAYBACK_RATES, useAudioPlayer} from '@/lib/useAudioPlayer';

interface LessonAudioPlayerProps {
  topicId: string;
  lessonId: string;
  lessonTitle: string;
  // Called when narration finishes, e.g. to advance to the next lesson.
  onEnded?: () => void;
}

function positionStorageKey(topicId: string, lessonId: string): string {
  return `skillsync:lesson-audio-pos:${topicId}:${lessonId}`;
}

/**
 * Podcast-style player for a lesson's generated narration. Loads the audio
 * manifest, plays the stitched full.mp3, and exposes chapter navigation, speed
 * control, resume-from-last-position, and lock-screen controls.
 */
export default function LessonAudioPlayer({topicId, lessonId, lessonTitle, onEnded}: LessonAudioPlayerProps) {
  const [manifest, setManifest] = useState<LessonAudioManifest | null>(null);
  const [expanded, setExpanded] = useState(false);
  const restoredRef = useRef(false);
  const currentTimeRef = useRef(0);
  const chaptersRef = useRef<LessonAudioManifest['chapters']>([]);

  const chapters = manifest?.chapters ?? [];
  chaptersRef.current = chapters;

  function chapterIndexAt(time: number): number {
    const list = chaptersRef.current;
    if (list.length === 0) return -1;
    let idx = 0;
    for (let i = 0; i < list.length; i++) {
      if (time >= list[i].start) idx = i;
    }
    return idx;
  }

  function seekToChapter(index: number) {
    const chapter = chaptersRef.current[index];
    if (chapter) seek(chapter.start);
  }

  const {audioRef, isPlaying, currentTime, duration, playbackRate, toggle, seek, setRate, bind, play} =
    useAudioPlayer({
      onEnded,
      mediaSession: manifest ? {title: lessonTitle, album: 'Lesson narration'} : undefined,
      onNext: () => {
        const i = chapterIndexAt(currentTimeRef.current);
        seekToChapter(Math.min(i + 1, chaptersRef.current.length - 1));
      },
      onPrevious: () => {
        const i = chapterIndexAt(currentTimeRef.current);
        seekToChapter(Math.max(i - 1, 0));
      },
    });

  currentTimeRef.current = currentTime;
  const activeChapterIndex = chapterIndexAt(currentTime);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/media/${topicId}/lessons/${lessonId}/audio/manifest.json`)
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!cancelled) setManifest(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [topicId, lessonId]);

  // Restore last playback position once metadata is known.
  useEffect(() => {
    if (!manifest || restoredRef.current || duration === 0) return;
    restoredRef.current = true;
    const saved = Number(localStorage.getItem(positionStorageKey(topicId, lessonId)) ?? '0');
    if (saved > 0 && saved < duration - 1) seek(saved);
  }, [manifest, duration, topicId, lessonId, seek]);

  // Persist position as it changes.
  useEffect(() => {
    if (!manifest || currentTime <= 0) return;
    localStorage.setItem(positionStorageKey(topicId, lessonId), String(Math.floor(currentTime)));
  }, [currentTime, manifest, topicId, lessonId]);

  if (!manifest) return null;

  const audioUrl = `/api/media/${topicId}/${manifest.fullFile}`;
  const activeChapter = chapters[activeChapterIndex];

  const cycleRate = () => {
    const idx = PLAYBACK_RATES.indexOf(playbackRate as (typeof PLAYBACK_RATES)[number]);
    setRate(PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length]);
  };

  return (
    <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 overflow-hidden">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={bind.onTimeUpdate}
        onLoadedMetadata={bind.onLoadedMetadata}
        onEnded={bind.onEnded}
        onPlay={bind.onPlay}
        onPause={bind.onPause}
        className="hidden"
      />

      <div className="flex items-center gap-3 p-3">
        <button
          onClick={() => {
            if (!isPlaying) setExpanded(true);
            toggle();
          }}
          className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-primary-600 hover:bg-primary-500 text-white transition-colors"
          title={isPlaying ? 'Pause' : 'Listen to lesson'}>
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-gray-300">
            <Headphones className="w-3.5 h-3.5 text-primary-400" />
            <span className="font-medium truncate">
              {activeChapter ? activeChapter.title : 'Listen to this lesson'}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max={duration || manifest.duration || 0}
            value={currentTime}
            onChange={e => seek(Number.parseFloat(e.target.value))}
            className="mt-1.5 w-full h-1 bg-surface-3 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500"
          />
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration || manifest.duration)}</span>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => seekToChapter(Math.max(activeChapterIndex - 1, 0))}
            className="p-1.5 rounded-lg hover:bg-surface-3 text-gray-400 hover:text-white transition-colors"
            title="Previous chapter">
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => seekToChapter(Math.min(activeChapterIndex + 1, chapters.length - 1))}
            className="p-1.5 rounded-lg hover:bg-surface-3 text-gray-400 hover:text-white transition-colors"
            title="Next chapter">
            <SkipForward className="w-4 h-4" />
          </button>
          <button
            onClick={cycleRate}
            className="px-1.5 py-0.5 rounded bg-surface-2 hover:bg-surface-3 text-[10px] font-mono text-gray-300 transition-colors"
            title="Playback speed">
            {playbackRate}x
          </button>
          {chapters.length > 1 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-2 py-0.5 rounded bg-surface-2 hover:bg-surface-3 text-[10px] text-gray-300 transition-colors"
              title="Chapters">
              {expanded ? <X className="w-3.5 h-3.5" /> : `${chapters.length} ch`}
            </button>
          )}
        </div>
      </div>

      {expanded && chapters.length > 1 && (
        <div className="border-t border-primary/20 max-h-48 overflow-y-auto">
          {chapters.map((chapter, index) => (
            <button
              key={chapter.sectionId}
              onClick={() => {
                seekToChapter(index);
                if (!isPlaying) play();
              }}
              className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                index === activeChapterIndex
                  ? 'bg-primary-500/20 text-primary-300'
                  : 'text-gray-400 hover:bg-surface-3 hover:text-white'
              }`}>
              <span className="truncate">
                {index + 1}. {chapter.title}
              </span>
              <span className="flex-shrink-0 text-[10px] text-gray-500">
                {formatDuration(chapter.start)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
