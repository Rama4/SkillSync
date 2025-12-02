"use client";

import { Note } from "@/lib/types";
import { useState, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import NoteItem from "./NoteItem";
import NoteEditor from "./NoteEditor";

interface NotesPanelProps {
  topicId: string;
  lessonId: string;
}

export default function NotesPanel({ topicId, lessonId }: NotesPanelProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const loadNotes = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/topics/${topicId}/lessons/${lessonId}/notes`
      );
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || []);
      }
    } catch (error) {
      console.error("Error loading notes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [topicId, lessonId]);

  const handleSave = (note: Note) => {
    setShowEditor(false);
    setEditingNote(null);
    loadNotes();
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setShowEditor(true);
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/topics/${topicId}/lessons/${lessonId}/notes/${noteId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        loadNotes();
      } else {
        alert("Failed to delete note");
      }
    } catch (error) {
      console.error("Error deleting note:", error);
      alert("Failed to delete note");
    }
  };

  const handleDeleteAudio = async (noteId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete the audio recording? The text note will be kept."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `/api/topics/${topicId}/lessons/${lessonId}/notes/${noteId}/audio`,
        { method: "DELETE" }
      );

      if (response.ok) {
        const result = await response.json();
        console.log("Audio deletion result:", result);
        loadNotes(); // Refresh to show updated note without audio
      } else {
        const errorData = await response.json();
        alert(errorData.error || "Failed to delete audio");
      }
    } catch (error) {
      console.error("Error deleting audio:", error);
      alert("Failed to delete audio");
    }
  };

  const handleNewNote = () => {
    setEditingNote(null);
    setShowEditor(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Notes</h3>
        {!showEditor && (
          <button
            onClick={handleNewNote}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No notes yet. Create your first note!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notes.map((note) => (
                <NoteItem
                  key={note.id}
                  note={note}
                  topicId={topicId}
                  lessonId={lessonId}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onDeleteAudio={handleDeleteAudio}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
