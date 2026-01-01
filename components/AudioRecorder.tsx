'use client';

import type React from 'react';

import {useEffect, useState, useRef, useCallback} from 'react';
import {formatDuration} from '@/lib/noteUtils';
import {Mic, Square, Trash2, Play, Pause} from 'lucide-react';

export default function AudioRecorder({
  mediaUrl,
  setMedia,
}: {
  mediaUrl: string;
  setMedia: (media: Blob | null) => void;
}) {
  const [mediaBlobUrl, setMediaBlobUrl] = useState<string | null>(mediaUrl || null);
  const [isActive, setIsActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);

  useEffect(() => {
    if (mediaUrl) {
      setMediaBlobUrl(mediaUrl);
    }
  }, [mediaUrl, setMediaBlobUrl]);

  const stopStream = useCallback(() => {
    if (!stream) return;
    const tracks = stream.getTracks();
    tracks.forEach(track => track.stop());
    setStream(null);
    setRecordingDuration(0);
  }, [stream]);

  const startRecordingWithStream = useCallback(
    (mediaStream: MediaStream) => {
      setRecordingDuration(0);
      recorder.current = new MediaRecorder(mediaStream);
      recorder.current.start();
      setIsActive(true);

      let chunks: Blob[] = [];
      recorder.current.ondataavailable = (event: BlobEvent) => {
        chunks.push(event.data);
      };
      recorder.current.onstop = () => {
        const mediaBlob = new Blob(chunks, {type: recorder.current?.mimeType || 'audio/webm'});
        const url = URL.createObjectURL(mediaBlob);
        setMediaBlobUrl(url);
        setMedia(mediaBlob);
        chunks = [];
      };
    },
    [setMedia, setRecordingDuration],
  );

  const startMediaStream = useCallback(() => {
    stopStream();

    navigator.mediaDevices
      .getUserMedia({audio: true})
      .then(newStream => {
        setStream(newStream);
        startRecordingWithStream(newStream);
      })
      .catch(error => console.error('Error accessing user media:', error));
  }, [stopStream, startRecordingWithStream]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive) {
      interval = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isActive, recordingDuration]);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream, setMediaBlobUrl, setMedia, setIsActive]);

  const handleStartRecording = useCallback(() => {
    startMediaStream();
  }, [startMediaStream]);

  const handleStop = () => {
    if (recorder.current && recorder.current.state === 'recording') {
      recorder.current.stop();
      setIsActive(false);
      stopStream();
    }
  };

  const handleClear = () => {
    setMediaBlobUrl(null);
    setMedia(null);
    setIsActive(false);
    setIsPlaying(false);
    stopStream();
  };

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
    <>
      <div className="flex flex-col w-full bg-surface-2 rounded-lg overflow-hidden">
        {mediaBlobUrl ? (
          <div className="flex flex-col gap-2 p-3">
            <audio
              ref={audioRef}
              src={mediaBlobUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={handleEnded}
              className="hidden"
            />

            <div className="flex items-center gap-2">
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
                  <span>{formatDuration(Math.floor(currentTime))}</span>
                  <span>{formatDuration(Math.floor(duration))}</span>
                </div>
              </div>

              <button
                onClick={handleClear}
                className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors"
                title="Clear audio recording">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 p-3">
            {isActive && (
              <div className="text-xs text-center text-gray-400 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                Recording: {formatDuration(recordingDuration)}
              </div>
            )}
            <button
              onClick={() => (!isActive ? handleStartRecording() : handleStop())}
              className={`${
                isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-primary-600 hover:bg-primary-500'
              } text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors w-full justify-center`}
              title={isActive ? 'Stop Recording' : 'Record voice note'}>
              {isActive ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {isActive ? 'Stop Recording' : 'Record Voice Note'}
            </button>
          </div>
        )}
      </div>
    </>
  );
}
