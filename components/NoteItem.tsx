'use client';

import type {Note, TranscriptSegment} from '@/lib/types';
import {useEffect, useState} from 'react';
import {Edit2, Trash2, MicOff} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {getAudioPlayerUrl, getTranscriptUrl} from '@/lib/noteUtils';
import AudioPlayer from './AudioPlayer';

interface NoteItemProps {
  note: Note;
  topicId: string;
  lessonId: string;
  onEdit: (note: Note) => void;
  onDeleteNotePress: (noteId: string) => void;
  onDeleteAudio?: (noteId: string) => void;
}

export default function NoteItem({note, topicId, lessonId, onEdit, onDeleteNotePress, onDeleteAudio}: NoteItemProps) {
  const [showFullContent, setShowFullContent] = useState(false);
  const [segments, setSegments] = useState<TranscriptSegment[] | undefined>(undefined);

  // Pull the transcript sidecar (if the transcribe-audio pipeline produced one)
  // so the player can render a synced, tap-to-seek transcript.
  useEffect(() => {
    if (!note.audioFile) return;
    let cancelled = false;
    fetch(getTranscriptUrl(topicId, lessonId, note.id))
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!cancelled && data?.segments) setSegments(data.segments);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [note.audioFile, note.id, topicId, lessonId]);

  const truncatedMarkdown = note.markdown.length > 200 ? note.markdown.substring(0, 200) + '...' : note.markdown;

  return (
    <div className="card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-white text-sm flex-1">{note.title}</h4>
        <div className="flex items-center gap-1">
          {note.audioFile && onDeleteAudio && (
            <button
              onClick={() => onDeleteAudio(note.id)}
              className="p-1.5 rounded-lg bg-surface-2 hover:bg-red-500/20 text-gray-400 hover:text-red-400 transition-colors"
              title="Delete audio only">
              <MicOff className="w-3.5 h-3.5" />
            </button>
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

      {note.audioFile && (
        <AudioPlayer
          audioUrl={getAudioPlayerUrl(topicId, lessonId, note.id)}
          title={note.title}
          transcriptSegments={segments}
        />
      )}

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
  );
}
