import {NextRequest, NextResponse} from 'next/server';
import {Lesson, LessonMeta} from '@/lib/types';
import {saveLesson, deleteLesson, updateTopicMeta} from '@/lib/fileUtils';
import {getTopic, getLessons, getLesson} from '@/lib/data';

interface RouteParams {
  params: Promise<{
    topicId: string;
    lessonId: string;
  }>;
}

// GET - Get single lesson
export async function GET(request: NextRequest, {params}: RouteParams) {
  try {
    const {topicId, lessonId} = await params;
    const lesson = await getLesson(topicId, lessonId);

    if (!lesson) {
      return NextResponse.json({error: 'Lesson not found'}, {status: 404});
    }

    return NextResponse.json({lesson});
  } catch (error) {
    console.error('Error fetching lesson:', error);
    return NextResponse.json({error: 'Failed to fetch lesson'}, {status: 500});
  }
}

// PUT - Update lesson
export async function PUT(request: NextRequest, {params}: RouteParams) {
  try {
    const {topicId, lessonId} = await params;
    const body = await request.json();

    const existingLesson = await getLesson(topicId, lessonId);
    if (!existingLesson) {
      return NextResponse.json({error: 'Lesson not found'}, {status: 404});
    }

    // Update lesson
    const updatedLesson: Lesson = {
      ...existingLesson,
      title: body.title ?? existingLesson.title,
      objectives: body.objectives ?? existingLesson.objectives,
      sections: body.sections ?? existingLesson.sections,
      keyTakeaways: body.keyTakeaways ?? existingLesson.keyTakeaways,
      resources: body.resources ?? existingLesson.resources,
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    saveLesson(updatedLesson, topicId);

    // Update topic metadata
    const topic = await getTopic(topicId);
    if (topic) {
      const allLessons = await getLessons(topicId);
      const lessonMetas: LessonMeta[] = allLessons
        .sort((a, b) => a.order - b.order)
        .map(lesson => ({
          id: lesson.id,
          order: lesson.order,
          title: lesson.title,
        }));
      updateTopicMeta(topicId, lessonMetas);
    }

    return NextResponse.json({lesson: updatedLesson});
  } catch (error) {
    console.error('Error updating lesson:', error);
    return NextResponse.json({error: 'Failed to update lesson'}, {status: 500});
  }
}

// DELETE - Delete lesson
export async function DELETE(request: NextRequest, {params}: RouteParams) {
  try {
    const {topicId, lessonId} = await params;

    const lesson = await getLesson(topicId, lessonId);
    if (!lesson) {
      return NextResponse.json({error: 'Lesson not found'}, {status: 404});
    }

    // Update previous and next lesson references
    const allLessons = await getLessons(topicId);
    if (lesson.previousLesson) {
      const previousLesson = allLessons.find(l => l.id === lesson.previousLesson);
      if (previousLesson) {
        previousLesson.nextLesson = lesson.nextLesson;
        saveLesson(previousLesson, topicId);
      }
    }
    if (lesson.nextLesson) {
      const nextLesson = allLessons.find(l => l.id === lesson.nextLesson);
      if (nextLesson) {
        nextLesson.previousLesson = lesson.previousLesson;
        saveLesson(nextLesson, topicId);
      }
    }

    // Delete lesson
    deleteLesson(lessonId, topicId);

    // Update topic metadata
    const topic = await getTopic(topicId);
    if (topic) {
      const remainingLessons = await getLessons(topicId);
      const lessonMetas: LessonMeta[] = remainingLessons
        .sort((a, b) => a.order - b.order)
        .map(l => ({
          id: l.id,
          order: l.order,
          title: l.title,
        }));
      updateTopicMeta(topicId, lessonMetas);
    }

    return NextResponse.json({success: true});
  } catch (error) {
    console.error('Error deleting lesson:', error);
    return NextResponse.json({error: 'Failed to delete lesson'}, {status: 500});
  }
}
