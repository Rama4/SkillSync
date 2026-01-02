'use client';

import {Play, Pause} from 'lucide-react';
import {useEffect, useRef, useState} from 'react';
import {formatDuration} from '@/lib/noteUtils';

interface AudioPlayerProps {
  audioUrl: string;
}

export default function AudioPlayer({audioUrl}: AudioPlayerProps) {
  const [mediaBlobUrl, setMediaBlobUrl] = useState<string | ''>('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioUrl?.trim()?.length > 0) {
      setMediaBlobUrl(audioUrl);
    }
  }, [audioUrl, setMediaBlobUrl]);

  const handlePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number.parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
      <audio
        ref={audioRef}
        src={mediaBlobUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        className="hidden"
      />
      <button
        onClick={handlePlayPause}
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
          onChange={handleSeek}
          className="w-full h-1 bg-surface-3 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary-500"
        />
        <div className="flex justify-between text-[10px] text-gray-500">
          <span>{formatDuration(currentTime)}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>
    </div>
  );
}
