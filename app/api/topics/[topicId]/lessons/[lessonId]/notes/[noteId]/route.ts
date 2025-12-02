import { NextRequest, NextResponse } from 'next/server';
import { Note } from '@/lib/types';
import { getNotes, saveNote, deleteNote } from '@/lib/fileUtils';

interface RouteParams {
  params: Promise<{
    topicId: string;
    lessonId: string;
    noteId: string;
  }>;
}

// PUT - Update note
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { topicId, lessonId, noteId } = await params;
    const body = await request.json();
    
    // Get existing notes to find the one to update
    const notes = getNotes(topicId, lessonId);
    const existingNote = notes.find(n => n.id === noteId);
    
    if (!existingNote) {
      return NextResponse.json(
        { error: 'Note not found' },
        { status: 404 }
      );
    }
    
    // Update note
    const updatedNote: Note = {
      ...existingNote,
      title: body.title ?? existingNote.title,
      markdown: body.markdown ?? existingNote.markdown,
      updatedAt: new Date().toISOString(),
    };
    
    // Handle audio file if provided
    if (body.audioFile !== undefined) {
      updatedNote.audioFile = body.audioFile;
    }
    
    saveNote(updatedNote, topicId);
    
    return NextResponse.json({ note: updatedNote });
  } catch (error) {
    console.error('Error updating note:', error);
    return NextResponse.json(
      { error: 'Failed to update note' },
      { status: 500 }
    );
  }
}

// DELETE - Delete note
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { topicId, lessonId, noteId } = await params;
    
    deleteNote(noteId, lessonId, topicId);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting note:', error);
    return NextResponse.json(
      { error: 'Failed to delete note' },
      { status: 500 }
    );
  }
}

