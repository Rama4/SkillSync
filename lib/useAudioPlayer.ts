'use client';

import {useCallback, useEffect, useRef, useState} from 'react';

export interface MediaSessionInfo {
  title: string;
  artist?: string;
  album?: string;
}

export interface UseAudioPlayerOptions {
  onEnded?: () => void;
  // When provided, the browser's lock-screen / hardware media controls are wired
  // up to this player via the Media Session API.
  mediaSession?: MediaSessionInfo;
  onNext?: () => void;
  onPrevious?: () => void;
}

export interface AudioPlayerControls {
  audioRef: React.RefObject<HTMLAudioElement>;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  play: () => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  setRate: (rate: number) => void;
  // Bind these to the <audio> element so the hook stays in sync.
  bind: {
    onTimeUpdate: () => void;
    onLoadedMetadata: () => void;
    onEnded: () => void;
    onPlay: () => void;
    onPause: () => void;
  };
}

/**
 * Shared playback state for a single <audio> element. Both the note AudioPlayer
 * and the lesson narration player build on this so seeking, speed, and progress
 * behave identically everywhere.
 */
export function useAudioPlayer(options: UseAudioPlayerOptions = {}): AudioPlayerControls {
  const {onEnded, mediaSession, onNext, onPrevious} = options;
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);

  const play = useCallback(() => {
    audioRef.current?.play().catch(err => console.error('Audio play failed:', err));
  }, []);

  const pause = useCallback(() => {
    audioRef.current?.pause();
  }, []);

  const toggle = useCallback(() => {
    if (!audioRef.current) return;
    if (audioRef.current.paused) {
      play();
    } else {
      pause();
    }
  }, [play, pause]);

  const seek = useCallback((time: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  }, []);

  const setRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
    setPlaybackRate(rate);
  }, []);

  const bind = {
    onTimeUpdate: useCallback(() => {
      if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
    }, []),
    onLoadedMetadata: useCallback(() => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration);
        audioRef.current.playbackRate = playbackRate;
      }
    }, [playbackRate]),
    onEnded: useCallback(() => {
      setIsPlaying(false);
      setCurrentTime(0);
      onEnded?.();
    }, [onEnded]),
    onPlay: useCallback(() => setIsPlaying(true), []),
    onPause: useCallback(() => setIsPlaying(false), []),
  };

  // Wire hardware / lock-screen controls when metadata is supplied.
  useEffect(() => {
    if (!mediaSession || typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }
    const ms = navigator.mediaSession;
    ms.metadata = new MediaMetadata({
      title: mediaSession.title,
      artist: mediaSession.artist ?? 'SkillSync',
      album: mediaSession.album,
    });
    ms.setActionHandler('play', play);
    ms.setActionHandler('pause', pause);
    ms.setActionHandler('seekto', details => {
      if (details.seekTime != null) seek(details.seekTime);
    });
    ms.setActionHandler('nexttrack', onNext ?? null);
    ms.setActionHandler('previoustrack', onPrevious ?? null);
    return () => {
      ms.setActionHandler('play', null);
      ms.setActionHandler('pause', null);
      ms.setActionHandler('seekto', null);
      ms.setActionHandler('nexttrack', null);
      ms.setActionHandler('previoustrack', null);
    };
  }, [mediaSession, play, pause, seek, onNext, onPrevious]);

  return {
    audioRef,
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    play,
    pause,
    toggle,
    seek,
    setRate,
    bind,
  };
}

export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;
