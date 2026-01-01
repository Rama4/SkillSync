'use client';

import type {Note} from '@/lib/types';
import {useState} from 'react';
import {Edit2, Trash2, Play, Pause, X, MicOff} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface NoteItemProps {
  note: Note;
  topicId: string;
  lessonId: string;
  onEdit: (note: Note) => void;
  onDeleteNotePress: (noteId: string) => void;
  onDeleteAudio?: (noteId: string) => void;
}

export default function NoteItem({note, topicId, lessonId, onEdit, onDeleteNotePress, onDeleteAudio}: NoteItemProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [showFullContent, setShowFullContent] = useState(false);

  const handlePlayAudio = async () => {
    if (!note.audioFile) return;

    if (audio && isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    const audioUrl = `/api/topics/${topicId}/lessons/${lessonId}/notes/${note.id}/audio`;
    const newAudio = new Audio(audioUrl);

    newAudio.onended = () => {
      setIsPlaying(false);
    };

    newAudio.onerror = error => {
      console.error('Audio playback error:', error);
      setIsPlaying(false);
      alert('Failed to play audio. The audio file may be corrupted or in an unsupported format.');
    };

    try {
      await newAudio.play();
      setAudio(newAudio);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
      alert('Failed to play audio. Please try again.');
    }
  };

  const handleStopAudio = () => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const truncatedMarkdown = note.markdown.length > 200 ? note.markdown.substring(0, 200) + '...' : note.markdown;

  return (
    <>
      <div className="card p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-semibold text-white text-sm flex-1">{note.title}</h4>
          <div className="flex items-center gap-1">
            {note.audioFile && (
              <>
                <button
                  onClick={isPlaying ? handleStopAudio : handlePlayAudio}
                  className="p-1 rounded-lg bg-surface-2 hover:bg-surface-3 text-gray-400 hover:text-white transition-colors"
                  title={isPlaying ? 'Stop audio' : 'Play audio'}>
                  {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>
                {onDeleteAudio && (
                  <button
                    onClick={() => onDeleteAudio?.(note.id)}
                    className="p-1.5 rounded-lg bg-surface-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete audio only">
                    <MicOff className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => onEdit(note)}
              className="p-1 rounded-lg bg-surface-2 hover:bg-surface-3 text-gray-400 hover:text-white transition-colors"
              title="Edit note">
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDeleteNotePress(note.id)}
              className="p-1 rounded-lg bg-surface-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
              title="Delete note">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {note.markdown && (
          <div className="prose prose-sm max-w-none text-xs">
            {showFullContent || note.markdown.length <= 200 ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.markdown}</ReactMarkdown>
            ) : (
              <>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{truncatedMarkdown}</ReactMarkdown>
                <button
                  onClick={() => setShowFullContent(true)}
                  className="text-primary-400 hover:text-primary-300 text-xs mt-1">
                  Show more...
                </button>
              </>
            )}
          </div>
        )}

        <div className="text-[10px] text-gray-500">
          {new Date(note.createdAt).toLocaleDateString()} {new Date(note.createdAt).toLocaleTimeString()}
        </div>
      </div>
    </>
  );
}
