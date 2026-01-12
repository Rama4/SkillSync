import {NextRequest, NextResponse} from 'next/server';
import {LessonSection} from '@/lib/types';
import {saveLesson, getFileType} from '@/lib/fileUtils';
import {getLesson} from '@/lib/data';

interface RouteParams {
  params: Promise<{
    topicId: string;
    lessonId: string;
    sectionId: string;
  }>;
}

// GET - Get single section
export async function GET(request: NextRequest, {params}: RouteParams) {
  try {
    const {topicId, lessonId, sectionId} = await params;
    const lesson = await getLesson(topicId, lessonId);

    if (!lesson) {
      return NextResponse.json({error: 'Lesson not found'}, {status: 404});
    }

    const section = lesson.sections.find(s => s.id === sectionId);
    if (!section) {
      return NextResponse.json({error: 'Section not found'}, {status: 404});
    }

    return NextResponse.json({section});
  } catch (error) {
    console.error('Error fetching section:', error);
    return NextResponse.json({error: 'Failed to fetch section'}, {status: 500});
  }
}

// PUT - Update section
export async function PUT(request: NextRequest, {params}: RouteParams) {
  try {
    const {topicId, lessonId, sectionId} = await params;
    const body = await request.json();

    const lesson = await getLesson(topicId, lessonId);
    if (!lesson) {
      return NextResponse.json({error: 'Lesson not found'}, {status: 404});
    }

    const sectionIndex = lesson.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) {
      return NextResponse.json({error: 'Section not found'}, {status: 404});
    }

    // Update section
    const updatedSection: LessonSection = {
      ...lesson.sections[sectionIndex],
      title: body.title ?? lesson.sections[sectionIndex].title,
      type: body.type ?? lesson.sections[sectionIndex].type,
      content: body.content ?? lesson.sections[sectionIndex].content,
      ...(body.codeLanguage !== undefined && {codeLanguage: body.codeLanguage}),
      ...(body.videoUrl !== undefined && {videoUrl: body.videoUrl}),
      ...(body.filePath !== undefined && {
        filePath: body.filePath,
        // Auto-detect fileType if filePath changed and fileType not explicitly provided
        fileType:
          body.fileType !== undefined
            ? body.fileType
            : body.filePath
            ? getFileType(body.filePath)
            : lesson.sections[sectionIndex].fileType,
      }),
    };

    lesson.sections[sectionIndex] = updatedSection;
    saveLesson(lesson, topicId);

    return NextResponse.json({section: updatedSection});
  } catch (error) {
    console.error('Error updating section:', error);
    return NextResponse.json({error: 'Failed to update section'}, {status: 500});
  }
}

// DELETE - Delete section
export async function DELETE(request: NextRequest, {params}: RouteParams) {
  try {
    const {topicId, lessonId, sectionId} = await params;

    const lesson = await getLesson(topicId, lessonId);
    if (!lesson) {
      return NextResponse.json({error: 'Lesson not found'}, {status: 404});
    }

    const sectionIndex = lesson.sections.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1) {
      return NextResponse.json({error: 'Section not found'}, {status: 404});
    }

    // Remove section
    lesson.sections.splice(sectionIndex, 1);
    saveLesson(lesson, topicId);

    return NextResponse.json({success: true});
  } catch (error) {
    console.error('Error deleting section:', error);
    return NextResponse.json({error: 'Failed to delete section'}, {status: 500});
  }
}
