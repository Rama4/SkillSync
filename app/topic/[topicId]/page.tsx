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
      <section className="pt-24 pb-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Breadcrumb */}
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm mb-8"
          >
            <ChevronLeft className="w-4 h-4" />
            All Topics
          </Link>

          {/* Topic Header */}
          <div className="flex items-start gap-6 mb-8">
            <div 
              className="text-5xl p-4 rounded-2xl"
              style={{ backgroundColor: `${topic.color}15` }}
            >
              {topic.icon}
            </div>
            <div className="flex-grow">
              <h1 className="text-4xl font-bold font-display text-white mb-3">
                {topic.title}
              </h1>
              <p className="text-gray-400 text-lg leading-relaxed mb-4">
                {topic.description}
              </p>
              
              {/* Stats */}
              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center gap-2 text-gray-400">
                  <BookOpen className="w-4 h-4" />
                  <span>{lessons.length} lessons</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>{totalDuration} min total</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400">
                  <Target className="w-4 h-4" />
                  <span>{lessons.reduce((acc, l) => acc + (l.objectives?.length || 0), 0)} objectives</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-8">
            {topic.tags.map((tag) => (
              <span 
                key={tag}
                className="px-3 py-1.5 text-sm bg-surface-2 text-gray-400 rounded-lg border border-surface-3"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Lessons List */}
      <section className="pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold font-display text-white mb-6">
            Course Content
          </h2>

          <div className="space-y-3">
            {lessons.map((lesson, index) => (
              <Link
                key={lesson.id}
                href={`/topic/${topicId}/lesson/${lesson.id}`}
                className="card card-hover p-5 flex items-center gap-4 group"
              >
                {/* Lesson number */}
                <div className="w-10 h-10 rounded-xl bg-surface-3 flex items-center justify-center text-gray-400 font-semibold group-hover:bg-primary-500/20 group-hover:text-primary-400 transition-colors">
                  {index + 1}
                </div>

                {/* Content */}
                <div className="flex-grow min-w-0">
                  <h3 className="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors mb-1 truncate">
                    {lesson.title}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4" />
                      {lesson.duration}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-xs border ${getDifficultyColor(lesson.difficulty)}`}>
                      {lesson.difficulty}
                    </span>
                  </div>
                </div>

                {/* Objectives count */}
                {lesson.objectives && lesson.objectives.length > 0 && (
                  <div className="hidden sm:flex items-center gap-1.5 text-sm text-gray-500">
                    <CheckCircle className="w-4 h-4" />
                    {lesson.objectives.length} objectives
                  </div>
                )}

                {/* Arrow */}
                <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>

          {lessons.length === 0 && (
            <div className="text-center py-12 card">
              <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Lessons Yet</h3>
              <p className="text-gray-400">Lessons will appear here once added to the data folder.</p>
            </div>
          )}

          {/* Start Learning CTA */}
          {lessons.length > 0 && (
            <div className="mt-8 text-center">
              <Link
                href={`/topic/${topicId}/lesson/${lessons[0].id}`}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold hover:from-primary-500 hover:to-primary-400 transition-all shadow-lg shadow-primary-500/25"
              >
                Start Learning
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

