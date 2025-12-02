"use client";

import { Note } from "@/lib/types";
import { useState, useRef, useEffect } from "react";
import { Save, X, Mic, Square, Loader2 } from "lucide-react";

interface NoteEditorProps {
  note?: Note | null;
  topicId: string;
  lessonId: string;
  onSave: (note: Note) => void;
  onCancel: () => void;
}

export default function NoteEditor({
  note,
  topicId,
  lessonId,
  onSave,
  onCancel,
}: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title || "");
  const [markdown, setMarkdown] = useState(note?.markdown || "");
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Set initial audio URL if editing existing note with audio
    if (note?.audioFile) {
      setAudioUrl(
        `/api/topics/${topicId}/lessons/${lessonId}/notes/${note.id}/audio`
      );
    }
  }, [note, topicId, lessonId]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        console.log("Audio recording stopped, blob size:", blob.size);
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error starting recording:", error);
      alert("Failed to start recording. Please check microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert("Please enter a title");
      return;
    }

    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("markdown", markdown);

      // If new audio recorded, add it
      if (audioBlob && !note?.audioFile) {
        console.log("Adding audio to form data, blob size:", audioBlob.size);
        formData.append("audio", audioBlob, "recording.webm");
      }

      let savedNote: Note;

      if (note) {
        // Update existing note
        const response = await fetch(
          `/api/topics/${topicId}/lessons/${lessonId}/notes/${note.id}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, markdown }),
          }
        );

        if (!response.ok) throw new Error("Failed to update note");

        const data = await response.json();
        savedNote = data.note;

        // If new audio recorded, upload it
        if (audioBlob) {
          const audioFormData = new FormData();
          audioFormData.append("audio", audioBlob, "recording.webm");
          await fetch(
            `/api/topics/${topicId}/lessons/${lessonId}/notes/${note.id}/audio`,
            {
              method: "POST",
              body: audioFormData,
            }
          );
        }
      } else {
        // Create new note
        const response = await fetch(
          `/api/topics/${topicId}/lessons/${lessonId}/notes`,
          {
            method: "POST",
            body: formData,
          }
        );

        if (!response.ok) throw new Error("Failed to create note");

        const data = await response.json();
        savedNote = data.note;
      }

      onSave(savedNote);
    } catch (error) {
      console.error("Error saving note:", error);
      alert("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white">
          {note ? "Edit Note" : "New Note"}
        </h3>
        <button
          onClick={onCancel}
          className="p-1 rounded-lg hover:bg-surface-2 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Note title"
          className="w-full px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div>
        <textarea
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          placeholder="Write your notes in markdown format..."
          rows={8}
          className="w-full px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-sm"
        />
      </div>

      <div className="flex items-center justify-center">
        {audioUrl && <audio src={audioUrl} controls className="w-full h-8" />}
      </div>
      <div className="flex items-center gap-3">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-white transition-colors"
          >
            <Mic className="w-4 h-4" />
            Record Audio
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
          >
            <Square className="w-4 h-4" />
            Stop Recording
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-500 text-white transition-colors disabled:opacity-50"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              Save Note
            </>
          )}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-white transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
