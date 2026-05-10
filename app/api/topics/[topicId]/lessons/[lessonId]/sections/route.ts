import { NextRequest, NextResponse } from 'next/server';
import { getLesson, saveLesson } from '@/lib/data';
import { LessonSection } from '@/lib/types';

interface RouteParams {
  params: Promise<{
    topicId: string;
    lessonId: string;
  }>;
}

// POST - Create new section
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { topicId, lessonId } = await params;
    const body = await request.json();

    const lesson = await getLesson(topicId, lessonId);

    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    // Generate section ID
    const sectionId = `section-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Create new section
    const newSection: LessonSection = {
      id: sectionId,
      title: body.title || 'Untitled Section',
      type: body.type || 'text',
      content: body.content || '',
      ...(body.codeLanguage && { codeLanguage: body.codeLanguage }),
      ...(body.videoUrl && { videoUrl: body.videoUrl }),
      ...(body.filePath && { filePath: body.filePath }),
      ...(body.fileType && { fileType: body.fileType }),
    };

    // Add section to lesson
    lesson.sections.push(newSection);
    lesson.lastUpdated = new Date().toISOString().split('T')[0];

    await saveLesson(lesson, topicId);

    return NextResponse.json({ 
      success: true,
      section: newSection 
    });

  } catch (error) {
    console.error('Error creating section:', error);
    return NextResponse.json(
      { error: 'Failed to create section' },
      { status: 500 }
    );
  }
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

    const lesson = await getLesson(topicId, lessonId);

    if (!lesson) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }
    
    // Update sections
    lesson.sections = sections;
    lesson.lastUpdated = new Date().toISOString().split('T')[0];

    await saveLesson(lesson, topicId);

    return NextResponse.json({ 
      success: true, 
      lesson: lesson 
    });

  } catch (error) {
    console.error('Error updating lesson sections:', error);
    return NextResponse.json(
      { error: 'Failed to update sections' },
      { status: 500 }
    );
  }
}
