
import { NextRequest, NextResponse } from 'next/server';
import { getLessonPath } from '@/lib/fileUtils';
import fs from 'fs';
import { Lesson } from '@/lib/types';

interface RouteParams {
  params: Promise<{
    topicId: string;
    lessonId: string;
  }>;
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { topicId, lessonId } = await params;
    const body = await request.json();
    const { sections } = body;

    if (!Array.isArray(sections)) {
      return NextResponse.json(
        { error: 'Sections must be an array' },
        { status: 400 }
      );
    }

    const lessonPath = getLessonPath(topicId, lessonId);

    if (!fs.existsSync(lessonPath)) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    const lessonData: Lesson = JSON.parse(fs.readFileSync(lessonPath, 'utf-8'));
    
    // Update sections
    lessonData.sections = sections;
    lessonData.lastUpdated = new Date().toISOString().split('T')[0];

    // Create backup of the old file just in case
    // fs.copyFileSync(lessonPath, `${lessonPath}.bak`);

    fs.writeFileSync(lessonPath, JSON.stringify(lessonData, null, 2), 'utf-8');

    return NextResponse.json({ 
      success: true, 
      lesson: lessonData 
    });

  } catch (error) {
    console.error('Error updating lesson sections:', error);
    return NextResponse.json(
      { error: 'Failed to update sections' },
      { status: 500 }
    );
  }
}
