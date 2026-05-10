import {NextRequest, NextResponse} from 'next/server';
import {Lesson, LessonMeta} from '@/lib/types';
import {generateLessonId} from '@/lib/fileUtils';
import {getTopic, getLessons, saveLesson, updateTopic} from '@/lib/data';

interface RouteParams {
  params: Promise<{
    topicId: string;
  }>;
}

// GET - List all lessons for a topic
export async function GET(request: NextRequest, {params}: RouteParams) {
  try {
    const {topicId} = await params;
    const lessons = await getLessons(topicId);
    return NextResponse.json({lessons});
  } catch (error) {
    console.error('Error fetching lessons:', error);
    return NextResponse.json({error: 'Failed to fetch lessons'}, {status: 500});
  }
}

// POST - Create new lesson
export async function POST(request: NextRequest, {params}: RouteParams) {
  try {
    const {topicId} = await params;
    const body = await request.json();

    // Get existing lessons to determine order
    const existingLessons = await getLessons(topicId);
    const newOrder = existingLessons.length > 0 ? Math.max(...existingLessons.map(l => l.order)) + 1 : 1;

    // Generate lesson ID
    const lessonId = generateLessonId(body.title || 'lesson', newOrder - 1);

    // Create new lesson
    const newLesson: Lesson = {
      id: lessonId,
      title: body.title || 'Untitled Lesson',
      topic: topicId,
      order: newOrder,
      objectives: body.objectives || [],
      sections: body.sections || [],
      quiz: [],
      keyTakeaways: [],
      previousLesson: existingLessons.length > 0 ? existingLessons[existingLessons.length - 1].id : null,
      nextLesson: null,
      resources: [],
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    // Update previous lesson's nextLesson reference
    if (existingLessons.length > 0) {
      const previousLesson = existingLessons[existingLessons.length - 1];
      previousLesson.nextLesson = lessonId;
      await saveLesson(previousLesson, topicId);
    }

    // Save new lesson
    await saveLesson(newLesson, topicId);

    // Update topic metadata
    const topic = await getTopic(topicId);
    if (topic) {
      // Re-fetch or append
      const allLessons = [...existingLessons, newLesson];
      topic.lessons = allLessons
        .sort((a, b) => a.order - b.order)
        .map(lesson => ({
          id: lesson.id,
          order: lesson.order,
          title: lesson.title,
        }));
      await updateTopic(topic);
    }

    return NextResponse.json({lesson: newLesson});
  } catch (error) {
    console.error('Error creating lesson:', error);
    return NextResponse.json({error: 'Failed to create lesson'}, {status: 500});
  }
}
