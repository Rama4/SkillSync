import { notFound } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import { getTopic, getLessons } from '@/lib/data';
import { Clock, BookOpen, ChevronRight, ChevronLeft, Target, CheckCircle } from 'lucide-react';

interface TopicPageProps {
  params: Promise<{
    topicId: string;
  }>;
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { topicId } = await params;
  const topic = await getTopic(topicId);
  const lessons = await getLessons(topicId);

  if (!topic) {
    notFound();
  }

  const totalDuration = lessons.reduce((acc, lesson) => {
    const mins = parseInt(lesson.duration) || 0;
    return acc + mins;
  }, 0);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-400 bg-green-400/10 border-green-400/20';
      case 'intermediate': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'advanced': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-gray-400 bg-gray-400/10 border-gray-400/20';
    }
  };

  return (
    <main className="min-h-screen">
      <Header />

      {/* Hero */}
      <section className="pt-16 pb-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <Link 
            href="/"
            className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-xs mb-3"
          >
            <ChevronLeft className="w-3 h-3" />
            All Topics
          </Link>

          {/* Topic Header */}
          <div className="flex items-start gap-4 mb-4">
            <div 
              className="text-3xl p-2.5 rounded-xl"
              style={{ backgroundColor: `${topic.color}15` }}
            >
              {topic.icon}
            </div>
            <div className="flex-grow">
              <h1 className="text-2xl font-bold font-display text-white mb-1.5">
                {topic.title}
              </h1>
              <p className="text-gray-400 text-sm leading-snug mb-2">
                {topic.description}
              </p>
              
              {/* Stats */}
              <div className="flex flex-wrap items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5 text-gray-400">
                  <BookOpen className="w-3 h-3" />
                  <span>{lessons.length} lessons</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{totalDuration} min total</span>
                </div>
                <div className="flex items-center gap-1.5 text-gray-400">
                  <Target className="w-3 h-3" />
                  <span>{lessons.reduce((acc, l) => acc + (l.objectives?.length || 0), 0)} objectives</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {topic.tags.map((tag) => (
              <span 
                key={tag}
                className="px-2 py-0.5 text-xs bg-surface-2 text-gray-400 rounded border border-surface-3"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Lessons List */}
      <section className="pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-base font-bold font-display text-white mb-3">
            Course Content
          </h2>

          <div className="space-y-2">
            {lessons.map((lesson, index) => (
              <Link
                key={lesson.id}
                href={`/topic/${topicId}/lesson/${lesson.id}`}
                className="card card-hover p-3 flex items-center gap-3 group"
              >
                {/* Lesson number */}
                <div className="w-7 h-7 rounded-lg bg-surface-3 flex items-center justify-center text-gray-400 text-sm font-semibold group-hover:bg-primary-500/20 group-hover:text-primary-400 transition-colors">
                  {index + 1}
                </div>

                {/* Content */}
                <div className="flex-grow min-w-0">
                  <h3 className="text-sm font-semibold text-white group-hover:text-primary-400 transition-colors mb-0.5 truncate">
                    {lesson.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {lesson.duration}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] border ${getDifficultyColor(lesson.difficulty)}`}>
                      {lesson.difficulty}
                    </span>
                  </div>
                </div>

                {/* Objectives count */}
                {lesson.objectives && lesson.objectives.length > 0 && (
                  <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
                    <CheckCircle className="w-3 h-3" />
                    {lesson.objectives.length}
                  </div>
                )}

                {/* Arrow */}
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>

          {lessons.length === 0 && (
            <div className="text-center py-8 card">
              <BookOpen className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-white mb-1.5">No Lessons Yet</h3>
              <p className="text-gray-400 text-sm">Lessons will appear here once added to the data folder.</p>
            </div>
          )}

          {/* Start Learning CTA */}
          {lessons.length > 0 && (
            <div className="mt-4 text-center">
              <Link
                href={`/topic/${topicId}/lesson/${lessons[0].id}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gradient-to-r from-primary-600 to-primary-500 text-white text-sm font-semibold hover:from-primary-500 hover:to-primary-400 transition-all shadow-lg shadow-primary-500/25"
              >
                Start Learning
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

