'use client';

import type {Note} from '@/lib/types';
import {useState, useEffect, useCallback} from 'react';
import {Plus, Loader2} from 'lucide-react';
import NoteItem from './NoteItem';
import NoteEditor from './NoteEditor';
import DeleteDialog from './DeleteDialog';

interface NotesPanelProps {
  topicId: string;
  lessonId: string;
}

export default function NotesPanel({topicId, lessonId}: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeleteAudioDialog, setShowDeleteAudioDialog] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);

  const loadNotes = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const response = await fetch(`/api/topics/${topicId}/lessons/${lessonId}/notes`, {signal});
        if (response.ok) {
          const data = await response.json();
          setNotes(data.notes || []);
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error loading notes:', error);
        }
      } finally {
        setLoading(false);
      }
    },
    [topicId, lessonId],
  );

  useEffect(() => {
    const controller = new AbortController();
    loadNotes(controller.signal);

    return () => controller.abort();
  }, [loadNotes]);

  const handleSave = useCallback(
    (note: Note) => {
      setNotes(prev => {
        const exists = prev.find(n => n.id === note.id);
        if (exists) {
          return prev.map(n => (n.id === note.id ? note : n));
        }
        return [note, ...prev];
      });

      setShowEditor(false);
      setEditingNote(null);
      loadNotes();
    },
    [loadNotes],
  );

  const handleEdit = useCallback((note: Note) => {
    setEditingNote(note);
    setShowEditor(true);
  }, []);

  const handleDelete = useCallback(
    async (noteId: string | null) => {
      if (!noteId) {
        setShowDeleteDialog(false);
        console.error('No note ID to delete');
        return;
      }

      const previousNotes = [...notes];
      setNotes(prev => prev.filter(n => n.id !== noteId));

      try {
        const response = await fetch(`/api/topics/${topicId}/lessons/${lessonId}/notes/${noteId}`, {method: 'DELETE'});

        if (!response.ok) {
          throw new Error('Failed to delete');
        }
      } catch (error) {
        console.error('Error deleting note:', error);
        alert('Failed to delete note');
        setNotes(previousNotes);
      }
    },
    [notes, topicId, lessonId],
  );

  const handleDeleteAudio = useCallback(
    async (noteId: string | null) => {
      setShowDeleteAudioDialog(false);
      if (!noteId) {
        console.error('No note ID to delete audio');
        return;
      }

      const previousNotes = [...notes];
      setNotes(prev => prev.map(n => (n.id === noteId ? {...n, audioUrl: undefined, audioDuration: undefined} : n)));

      try {
        const response = await fetch(`/api/topics/${topicId}/lessons/${lessonId}/notes/${noteId}/audio`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to delete audio');
        }
        loadNotes();
      } catch (error) {
        console.error('Error deleting audio:', error);
        alert((error as Error).message);
        setNotes(previousNotes);
      }
    },
    [notes, topicId, lessonId, loadNotes],
  );

  const handleNewNote = useCallback(() => {
    setEditingNote(null);
    setShowEditor(true);
  }, []);

  return (
    <>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Notes</h3>
          {!showEditor && (
            <button
              onClick={handleNewNote}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs transition-colors">
              <Plus className="w-3.5 h-3.5" />
              New Note
            </button>
          )}
        </div>

        {showEditor ? (
          <NoteEditor
            note={editingNote}
            topicId={topicId}
            lessonId={lessonId}
            onSave={handleSave}
            onCancel={() => {
              setShowEditor(false);
              setEditingNote(null);
            }}
          />
        ) : (
          <>
            {loading && notes.length === 0 ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            ) : notes.length === 0 ? (
              <div className="text-center py-6 text-gray-500 text-xs">
                <p>No notes yet. Create your first note!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notes.map((note, index) => (
                  <NoteItem
                    key={`${note.id}-${index}`}
                    note={note}
                    topicId={topicId}
                    lessonId={lessonId}
                    onEdit={handleEdit}
                    onDeleteNotePress={() => {
                      setShowDeleteDialog(true);
                      setDeletingNoteId(note.id);
                    }}
                    onDeleteAudio={() => {
                      setShowDeleteAudioDialog(true);
                      setDeletingNoteId(note.id);
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
      <DeleteDialog
        open={showDeleteAudioDialog}
        onOpenChange={setShowDeleteAudioDialog}
        onDelete={() => handleDeleteAudio(deletingNoteId)}
        description="Are you sure you want to delete this audio recording? This action cannot be undone. Your text notes will be kept."
        title="Delete Audio Recording?"
      />
      <DeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onDelete={() => handleDelete(deletingNoteId)}
        description="Are you sure you want to delete this note? This action cannot be undone."
        title="Delete Note?"
      />
    </>
  );
}
