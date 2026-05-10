import {NextRequest, NextResponse} from 'next/server';
import {getNotes, saveNote, saveAudioFile, getAudioFile, deleteAudioFile} from '@/lib/data';
import {Note} from '@/lib/types';

interface RouteParams {
  params: Promise<{
    topicId: string;
    lessonId: string;
    noteId: string;
  }>;
}

// GET - Serve audio file
export async function GET(request: NextRequest, {params}: RouteParams) {
  try {
    const {topicId, lessonId, noteId} = await params;

    const audioData = await getAudioFile(noteId, lessonId, topicId);

    if (!audioData) {
      return NextResponse.json({error: 'Audio file not found'}, {status: 404});
    }

    return new NextResponse(audioData.buffer, {
      headers: {
        'Content-Type': audioData.contentType,
        'Content-Length': audioData.buffer.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (error) {
    console.error('Error serving audio file:', error);
    return NextResponse.json({error: 'Failed to serve audio file'}, {status: 500});
  }
}

// POST - Upload/replace audio file
export async function POST(request: NextRequest, {params}: RouteParams) {
  try {
    const {topicId, lessonId, noteId} = await params;
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File | null;

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json({error: 'No audio file provided'}, {status: 400});
    }

    // Get existing note to update
    const notes = await getNotes(topicId, lessonId);
    const note = notes.find(n => n.id === noteId);

    if (!note) {
      return NextResponse.json({error: 'Note not found'}, {status: 404});
    }

    // Save audio file
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const extension = audioFile.name.split('.').pop() || 'webm';
    const audioPath = await saveAudioFile(audioBuffer, noteId, lessonId, topicId, extension);

    // Update note with audio file path
    note.audioFile = audioPath;
    note.updatedAt = new Date().toISOString();

    await saveNote(note, topicId);

    return NextResponse.json({
      success: true,
      audioFile: audioPath,
    });
  } catch (error) {
    console.error('Error uploading audio file:', error);
    return NextResponse.json({error: 'Failed to upload audio file'}, {status: 500});
  }
}

// DELETE - Delete audio file only (keep the note)
export async function DELETE(request: NextRequest, {params}: RouteParams) {
  try {
    const {topicId, lessonId, noteId} = await params;

    // Get existing note
    const notes = await getNotes(topicId, lessonId);
    const note = notes.find(n => n.id === noteId);

    if (!note) {
      return NextResponse.json({error: 'Note not found'}, {status: 404});
    }

    // Delete audio file
    await deleteAudioFile(noteId, lessonId, topicId);

    // Update note to remove audio file reference completely
    delete note.audioFile;
    note.updatedAt = new Date().toISOString();

    // Save the updated note
    await saveNote(note, topicId);

    return NextResponse.json({
      success: true,
      message: 'Audio file deleted successfully',
      updatedNote: {
        id: note.id,
        title: note.title,
        hasAudio: !!note.audioFile, // Should be false after deletion
        updatedAt: note.updatedAt,
      },
    });
  } catch (error) {
    console.error('Error deleting audio file:', error);
    return NextResponse.json({error: 'Failed to delete audio file'}, {status: 500});
  }
}
