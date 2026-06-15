'use client';

import {Play, Pause} from 'lucide-react';
import {formatDuration} from '@/lib/noteUtils';
import {PLAYBACK_RATES, useAudioPlayer} from '@/lib/useAudioPlayer';
import type {TranscriptSegment} from '@/lib/types';
import Transcript from './Transcript';

interface AudioPlayerProps {
  audioUrl: string;
  title?: string;
  // When provided, a synced, tap-to-seek transcript is shown beneath the player.
  transcriptSegments?: TranscriptSegment[];
}

export default function AudioPlayer({audioUrl, title, transcriptSegments}: AudioPlayerProps) {
  const {audioRef, isPlaying, currentTime, duration, playbackRate, toggle, seek, setRate, bind} =
    useAudioPlayer({mediaSession: title ? {title} : undefined});

  const cycleRate = () => {
    const idx = PLAYBACK_RATES.indexOf(playbackRate as (typeof PLAYBACK_RATES)[number]);
    const next = PLAYBACK_RATES[(idx + 1) % PLAYBACK_RATES.length];
    setRate(next);
  };

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
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
        <button
          onClick={toggle}
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-primary-600 hover:bg-primary-500 text-white transition-colors"
          title={isPlaying ? 'Pause' : 'Play'}>
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <div className="flex-1 flex flex-col gap-1">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={e => seek(Number.parseFloat(e.target.value))}
            className="w-full h-1 bg-surface-3 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500"
          />
          <div className="flex justify-between text-[10px] text-gray-500">
            <span>{formatDuration(currentTime)}</span>
            <span>{formatDuration(duration)}</span>
          </div>
        </div>

        <button
          onClick={cycleRate}
          className="flex-shrink-0 px-1.5 py-0.5 rounded bg-surface-2 hover:bg-surface-3 text-[10px] font-mono text-gray-300 transition-colors"
          title="Playback speed">
          {playbackRate}x
        </button>
      </div>

      {transcriptSegments && transcriptSegments.length > 0 && (
        <Transcript segments={transcriptSegments} currentTime={currentTime} onSeek={seek} />
      )}
    </div>
  );
}
