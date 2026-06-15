import {NextRequest, NextResponse} from 'next/server';
import {getNotes, getNotesDir, saveNote, saveAudioFile} from '@/lib/fileUtils';
import fs from 'fs';
import path from 'path';

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

    // Try different audio file extensions
    const audioDir = path.join(getNotesDir(topicId, lessonId), 'audio');
    const possibleExtensions = ['webm', 'mp3', 'm4a', 'wav', 'mp4'];
    let audioPath: string | null = null;
    let contentType = 'audio/mpeg';

    for (const ext of possibleExtensions) {
      const testPath = path.join(audioDir, `${noteId}.${ext}`);
      if (fs.existsSync(testPath)) {
        audioPath = testPath;
        contentType =
          ext === 'webm'
            ? 'audio/webm'
            : ext === 'mp3'
            ? 'audio/mpeg'
            : ext === 'm4a'
            ? 'audio/mp4'
            : ext === 'wav'
            ? 'audio/wav'
            : 'audio/mp4';
        break;
      }
    }

    if (!audioPath || !fs.existsSync(audioPath)) {
      return NextResponse.json({error: 'Audio file not found'}, {status: 404});
    }

    const stats = fs.statSync(audioPath);
    const fileSize = stats.size;
    const range = request.headers.get('range');

    // Stream a partial response when the player requests a byte range. This keeps
    // memory flat and makes seeking through long recordings reliable.
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      // @ts-ignore: fs streams work as a NextResponse body even if types disagree.
      const stream = fs.createReadStream(audioPath, {start, end});

      return new NextResponse(stream as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }

    // @ts-ignore: fs streams work as a NextResponse body even if types disagree.
    const stream = fs.createReadStream(audioPath);

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': fileSize.toString(),
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
    const notes = getNotes(topicId, lessonId);
    const note = notes.find(n => n.id === noteId);

    if (!note) {
      return NextResponse.json({error: 'Note not found'}, {status: 404});
    }

    // Save audio file
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const extension = audioFile.name.split('.').pop() || 'webm';
    const audioPath = saveAudioFile(audioBuffer, noteId, lessonId, topicId, extension);

    // Update note with audio file path
    note.audioFile = audioPath;
    note.updatedAt = new Date().toISOString();

    saveNote(note, topicId);

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
    const notes = getNotes(topicId, lessonId);
    const note = notes.find(n => n.id === noteId);

    if (!note) {
      return NextResponse.json({error: 'Note not found'}, {status: 404});
    }

    // Delete audio files if they exist (try different extensions)
    const audioDir = path.join(getNotesDir(topicId, lessonId), 'audio');
    const possibleExtensions = ['webm', 'mp3', 'm4a', 'wav', 'mp4'];
    let audioDeleted = false;

    for (const ext of possibleExtensions) {
      const audioPath = path.join(audioDir, `${noteId}.${ext}`);
      if (fs.existsSync(audioPath)) {
        fs.unlinkSync(audioPath);
        audioDeleted = true;
        break; // Only delete the first match
      }
    }

    if (!audioDeleted) {
      return NextResponse.json({error: 'Audio file not found'}, {status: 404});
    }

    // Update note to remove audio file reference completely
    console.log('Before deleting audioFile:', note.audioFile);
    delete note.audioFile;
    note.updatedAt = new Date().toISOString();
    console.log('After deleting audioFile, note:', JSON.stringify(note, null, 2));

    // Save the updated note
    saveNote(note, topicId);

    console.log('Updated note saved without audio');

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
