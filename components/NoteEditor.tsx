'use client';

import type {Note} from '@/lib/types';
import {useState, useEffect} from 'react';
import {X, Loader2, Check} from 'lucide-react';
import AudioRecorder from './AudioRecorder';
import DeleteDialog from './DeleteDialog';

interface NoteEditorProps {
  note?: Note | null;
  topicId: string;
  lessonId: string;
  onSave: (note: Note) => void;
  onCancel: () => void;
}

export default function NoteEditor({note, topicId, lessonId, onSave, onCancel}: NoteEditorProps) {
  const {id: noteId, title: noteTitle, markdown: noteMarkdown, audioFile: noteAudioFile} = note || {};
  const [title, setTitle] = useState(noteTitle || '');
  const [markdown, setMarkdown] = useState(noteMarkdown || '');
  const [isSaving, setIsSaving] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showDeleteAudioDialog, setShowDeleteAudioDialog] = useState(false);
  const [pendingAudioDelete, setPendingAudioDelete] = useState(false);

  useEffect(() => {
    if (noteAudioFile) {
      setAudioUrl(`/api/topics/${topicId}/lessons/${lessonId}/notes/${noteId}/audio`);
    }
  }, [noteAudioFile, noteId, topicId, lessonId, setAudioUrl]);

  const handleDeleteAudio = async () => {
    if (!noteId) {
      // If note hasn't been saved yet, just clear the audio blob
      setAudioBlob(null);
      setAudioUrl('');
      setShowDeleteAudioDialog(false);
      return;
    }

    try {
      const response = await fetch(`/api/topics/${topicId}/lessons/${lessonId}/notes/${noteId}/audio`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete audio');
      }

      setAudioUrl('');
      setAudioBlob(null);
      setPendingAudioDelete(true);
    } catch (error) {
      console.error('Error deleting audio:', error);
      alert((error as Error).message);
    } finally {
      setShowDeleteAudioDialog(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('markdown', markdown);

      let workingNote: Note = note as Note;

      if (!workingNote) {
        // Create new note
        const createNoteResponse = await fetch(`/api/topics/${topicId}/lessons/${lessonId}/notes`, {
          method: 'POST',
          body: formData,
        });

        if (!createNoteResponse.ok) throw new Error('Failed to create note');
        const newNoteData = await createNoteResponse.json();
        workingNote = newNoteData.note as Note;
      }

      let savedAudioFile: string | undefined;
      if (audioBlob) {
        const audioFormData = new FormData();
        const mimeType = audioBlob.type;
        const extension = mimeType.split('/')[1]?.split(';')[0] || 'webm';
        const fileName = `${workingNote.id}.${extension}`;
        audioFormData.append('audio', audioBlob, fileName);
        const audioUploadResponse = await fetch(
          `/api/topics/${topicId}/lessons/${lessonId}/notes/${workingNote.id}/audio`,
          {
            method: 'POST',
            body: audioFormData,
          },
        );
        const audioUploadData = await audioUploadResponse.json();
        if (audioUploadData?.success) {
          savedAudioFile = audioUploadData.audioFile;
        }
      }

      // Update existing note
      const response = await fetch(`/api/topics/${topicId}/lessons/${lessonId}/notes/${workingNote.id}`, {
        method: 'PUT',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          title: title,
          markdown: markdown,
          ...(savedAudioFile ? {audioFile: savedAudioFile} : {}),
          ...(pendingAudioDelete && !audioBlob ? {audioFile: null} : {}),
        }),
      });

      if (!response.ok) throw new Error('Failed to update note');
      const data = await response.json();
      workingNote = data.note;

      onSave(workingNote);
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className="card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">{note ? 'Edit Note' : 'New Note'}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="p-1.5 rounded-lg hover:bg-surface-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              title="Save note">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            </button>
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg hover:bg-surface-2 text-gray-400 hover:text-white transition-colors"
              title="Cancel">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Note title"
            className="w-full px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          />
        </div>

        <div>
          <textarea
            value={markdown}
            onChange={e => setMarkdown(e.target.value)}
            placeholder="Write your notes in markdown format..."
            rows={6}
            className="w-full px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-xs"
          />
        </div>

        <AudioRecorder mediaUrl={audioUrl} setMedia={setAudioBlob} />
      </div>

      <DeleteDialog
        open={showDeleteAudioDialog}
        onOpenChange={setShowDeleteAudioDialog}
        onDelete={handleDeleteAudio}
        description="Are you sure you want to delete this audio recording? This action cannot be undone. Your text notes will be kept."
        title="Delete Audio Recording?"
      />
    </>
  );
}
