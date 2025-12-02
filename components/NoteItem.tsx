'use client';

import { Note } from '@/lib/types';
import { useState } from 'react';
import { Edit2, Trash2, Play, Pause, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface NoteItemProps {
  note: Note;
  topicId: string;
  lessonId: string;
  onEdit: (note: Note) => void;
  onDelete: (noteId: string) => void;
  onDeleteAudio?: (noteId: string) => void;
}

export default function NoteItem({ note, topicId, lessonId, onEdit, onDelete, onDeleteAudio }: NoteItemProps) {
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

    newAudio.onerror = (error) => {
      console.error('Audio playback error:', error);
      setIsPlaying(false);
      alert('Failed to play audio. The audio file may be corrupted or in an unsupported format.');
    };

    newAudio.onloadstart = () => {
      console.log('Audio loading started');
    };

    newAudio.oncanplay = () => {
      console.log('Audio can start playing');
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

  const truncatedMarkdown = note.markdown.length > 200 
    ? note.markdown.substring(0, 200) + '...'
    : note.markdown;

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start justify-between">
        <h4 className="font-semibold text-white text-sm">{note.title}</h4>
        <div className="flex items-center gap-2">
          {note.audioFile && (
            <>
              <button
                onClick={isPlaying ? handleStopAudio : handlePlayAudio}
                className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-gray-400 hover:text-white transition-colors"
                title={isPlaying ? 'Stop audio' : 'Play audio'}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              {onDeleteAudio && (
                <button
                  onClick={() => onDeleteAudio(note.id)}
                  className="p-1.5 rounded-lg bg-surface-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
                  title="Delete audio only"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </>
          )}
          <button
            onClick={() => onEdit(note)}
            className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-gray-400 hover:text-white transition-colors"
            title="Edit note"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDelete(note.id)}
            className="p-1.5 rounded-lg bg-surface-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
            title="Delete note"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {note.markdown && (
        <div className="prose prose-sm max-w-none">
          {showFullContent || note.markdown.length <= 200 ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {note.markdown}
            </ReactMarkdown>
          ) : (
            <>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {truncatedMarkdown}
              </ReactMarkdown>
              <button
                onClick={() => setShowFullContent(true)}
                className="text-primary-400 hover:text-primary-300 text-sm mt-2"
              >
                Show more...
              </button>
            </>
          )}
        </div>
      )}

      <div className="text-xs text-gray-500">
        {new Date(note.createdAt).toLocaleDateString()} {new Date(note.createdAt).toLocaleTimeString()}
      </div>
    </div>
  );
}

