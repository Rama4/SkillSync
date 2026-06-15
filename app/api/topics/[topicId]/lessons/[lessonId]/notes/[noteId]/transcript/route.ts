import {NextRequest, NextResponse} from 'next/server';
import {getNotesDir} from '@/lib/fileUtils';
import fs from 'fs';
import path from 'path';

interface RouteParams {
  params: Promise<{
    topicId: string;
    lessonId: string;
    noteId: string;
  }>;
}

// GET - Serve the transcript sidecar written by the transcribe-audio pipeline.
export async function GET(request: NextRequest, {params}: RouteParams) {
  try {
    const {topicId, lessonId, noteId} = await params;

    const transcriptPath = path.join(
      getNotesDir(topicId, lessonId),
      'audio',
      `${noteId}.transcript.json`,
    );

    if (!fs.existsSync(transcriptPath)) {
      return NextResponse.json({error: 'Transcript not found'}, {status: 404});
    }

    const transcript = JSON.parse(fs.readFileSync(transcriptPath, 'utf-8'));
    return NextResponse.json(transcript, {
      headers: {'Cache-Control': 'public, max-age=3600'},
    });
  } catch (error) {
    console.error('Error serving transcript:', error);
    return NextResponse.json({error: 'Failed to serve transcript'}, {status: 500});
  }
}
