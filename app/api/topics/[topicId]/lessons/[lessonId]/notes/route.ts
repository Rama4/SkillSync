import { NextRequest, NextResponse } from "next/server";
import { Note } from "@/lib/types";
import { getNotes, saveNote } from "@/lib/fileUtils";

function generateNoteId(): string {
  return `note-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

interface RouteParams {
  params: Promise<{
    topicId: string;
    lessonId: string;
  }>;
}

// GET - List all notes for a lesson
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { topicId, lessonId } = await params;
    const notes = getNotes(topicId, lessonId);

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

// POST - Create new note
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { topicId, lessonId } = await params;
    const formData = await request.formData();

    const title = (formData.get("title") as string) || "Untitled Note";
    const markdown = (formData.get("markdown") as string) || "";
    const audioFile = formData.get("audio") as File | null;

    // Generate note ID
    const noteId = generateNoteId();

    // Create note object
    const note: Note = {
      id: noteId,
      lessonId,
      title,
      markdown,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Handle audio file if provided
    if (audioFile && audioFile.size > 0) {
      const { saveAudioFile } = await import("@/lib/fileUtils");
      const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
      const extension = audioFile.name.split(".").pop() || "webm";
      const audioPath = saveAudioFile(
        audioBuffer,
        noteId,
        lessonId,
        topicId,
        extension
      );
      note.audioFile = audioPath;
    }

    // Save note
    saveNote(note, topicId);

    return NextResponse.json({ note });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}
