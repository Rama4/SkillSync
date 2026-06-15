'use client';

import {useEffect, useRef} from 'react';
import type {TranscriptSegment} from '@/lib/types';

interface TranscriptProps {
  segments: TranscriptSegment[];
  currentTime: number;
  onSeek: (time: number) => void;
}

/**
 * Karaoke-style transcript: highlights the segment matching the current playback
 * position and lets the user tap any line to jump there.
 */
export default function Transcript({segments, currentTime, onSeek}: TranscriptProps) {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  const activeIndex = segments.findIndex(s => currentTime >= s.start && currentTime < s.end);

  useEffect(() => {
    activeRef.current?.scrollIntoView({block: 'nearest', behavior: 'smooth'});
  }, [activeIndex]);

  if (segments.length === 0) return null;

  return (
    <div className="mt-2 max-h-40 overflow-y-auto rounded-md bg-surface-0 border border-surface-3 p-2 space-y-0.5">
      {segments.map((segment, index) => {
        const isActive = index === activeIndex;
        return (
          <button
            key={segment.id ?? index}
            ref={isActive ? activeRef : null}
            onClick={() => onSeek(segment.start)}
            className={`block w-full text-left text-xs leading-relaxed px-1.5 py-0.5 rounded transition-colors ${
              isActive ? 'bg-primary-500/20 text-primary-300' : 'text-gray-400 hover:text-white'
            }`}>
            {segment.text.trim()}
          </button>
        );
      })}
    </div>
  );
}
