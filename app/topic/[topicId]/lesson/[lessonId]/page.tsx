import { notFound } from 'next/navigation';
import { getTopic, getLesson } from '@/lib/data';
import LessonView from './LessonView';

interface LessonPageProps {
  params: Promise<{
    topicId: string;
    lessonId: string;
  }>;
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { topicId, lessonId } = await params;
  const topic = await getTopic(topicId);
  const lesson = await getLesson(topicId, lessonId);

  if (!topic || !lesson) {
    notFound();
  }

  return (
    <LessonView 
      topic={topic} 
      lesson={lesson} 
    />
  );
}

