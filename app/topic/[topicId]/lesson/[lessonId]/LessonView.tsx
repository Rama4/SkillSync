'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import LessonContent from '@/components/LessonContent';
import LessonSidebar from '@/components/LessonSidebar';
import Quiz from '@/components/Quiz';
import { TopicMeta, Lesson } from '@/lib/types';
import { useProgressStore } from '@/lib/store';
import { 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Target, 
  BookOpen,
  CheckCircle,
  ExternalLink,
  Lightbulb,
  Menu,
  X
} from 'lucide-react';

interface LessonViewProps {
  topic: TopicMeta;
  lesson: Lesson;
}

export default function LessonView({ topic, lesson }: LessonViewProps) {
  const router = useRouter();
  const [currentSection, setCurrentSection] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const { markLessonComplete, isLessonComplete } = useProgressStore();

  const isQuizSection = currentSection === lesson.sections.length;
  const isComplete = isLessonComplete(topic.id, lesson.id);
  const progress = ((currentSection + 1) / (lesson.sections.length + 1)) * 100;

  const handleNext = () => {
    if (currentSection < lesson.sections.length) {
      setCurrentSection(currentSection + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleQuizComplete = () => {
    markLessonComplete(topic.id, lesson.id);
    if (lesson.nextLesson) {
      router.push(`/topic/${topic.id}/lesson/${lesson.nextLesson}`);
    } else {
      router.push(`/topic/${topic.id}`);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-400 bg-green-400/10';
      case 'intermediate': return 'text-yellow-400 bg-yellow-400/10';
      case 'advanced': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      {/* Sidebar */}
      <LessonSidebar
        topicId={topic.id}
        topicTitle={topic.title}
        lessons={topic.lessons}
        currentLessonId={lesson.id}
        sections={lesson.sections}
        currentSectionIndex={currentSection}
        onSectionChange={setCurrentSection}
      />

      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        className="lg:hidden fixed bottom-6 left-6 z-50 w-12 h-12 rounded-full bg-primary-600 text-white shadow-lg shadow-primary-500/30 flex items-center justify-center"
      >
        {showSidebar ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile sidebar overlay */}
      {showSidebar && (
        <div className="lg:hidden fixed inset-0 z-40">
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowSidebar(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-80 bg-surface-1 border-r border-surface-3 overflow-y-auto pt-20 pb-20">
            {/* Mobile sidebar content - same as desktop */}
            <div className="px-4 mb-6">
              <Link 
                href={`/topic/${topic.id}`}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
                onClick={() => setShowSidebar(false)}
              >
                <ChevronLeft className="w-4 h-4" />
                Back to {topic.title}
              </Link>
            </div>
            <div className="px-4 mb-8">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Sections
              </h3>
              <div className="space-y-1">
                {lesson.sections.map((section, index) => (
                  <button
                    key={section.id}
                    onClick={() => {
                      setCurrentSection(index);
                      setShowSidebar(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      index === currentSection
                        ? 'bg-primary-500/10 text-primary-400'
                        : 'text-gray-400 hover:bg-surface-2 hover:text-white'
                    }`}
                  >
                    {section.title}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setCurrentSection(lesson.sections.length);
                    setShowSidebar(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                    currentSection === lesson.sections.length
                      ? 'bg-primary-500/10 text-primary-400'
                      : 'text-gray-400 hover:bg-surface-2 hover:text-white'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Quiz
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="lg:ml-80 pt-16">
        {/* Progress bar */}
        <div className="sticky top-16 z-30 bg-surface-0/90 backdrop-blur-lg border-b border-surface-3">
          <div className="h-1 bg-surface-3">
            <div 
              className="h-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Lesson Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
              <span className={`px-2.5 py-1 rounded-full ${getDifficultyColor(lesson.difficulty)}`}>
                {lesson.difficulty}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {lesson.duration}
              </span>
              {isComplete && (
                <span className="flex items-center gap-1.5 text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  Completed
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold font-display text-white mb-4">
              {lesson.title}
            </h1>

            {/* Objectives */}
            {!isQuizSection && currentSection === 0 && (
              <div className="card p-5 bg-primary-500/5 border-primary-500/20 mb-8">
                <h3 className="flex items-center gap-2 text-primary-400 font-semibold mb-3">
                  <Target className="w-5 h-5" />
                  Learning Objectives
                </h3>
                <ul className="space-y-2">
                  {lesson.objectives.map((objective, index) => (
                    <li key={index} className="flex items-start gap-2 text-gray-300">
                      <CheckCircle className="w-4 h-4 text-primary-400 mt-0.5 flex-shrink-0" />
                      {objective}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Content or Quiz */}
          {isQuizSection ? (
            <div>
              <h2 className="text-2xl font-bold font-display text-white mb-6 flex items-center gap-3">
                <span className="w-1 h-8 bg-gradient-to-b from-primary-500 to-accent rounded-full" />
                Knowledge Check
              </h2>
              <Quiz
                questions={lesson.quiz}
                topicId={topic.id}
                lessonId={lesson.id}
                onComplete={handleQuizComplete}
              />
            </div>
          ) : (
            <>
              <LessonContent section={lesson.sections[currentSection]} />

              {/* Key Takeaways - show on last content section */}
              {currentSection === lesson.sections.length - 1 && lesson.keyTakeaways.length > 0 && (
                <div className="card p-5 bg-accent/5 border-accent/20 mt-8">
                  <h3 className="flex items-center gap-2 text-accent font-semibold mb-3">
                    <Lightbulb className="w-5 h-5" />
                    Key Takeaways
                  </h3>
                  <ul className="space-y-2">
                    {lesson.keyTakeaways.map((takeaway, index) => (
                      <li key={index} className="flex items-start gap-2 text-gray-300">
                        <span className="text-accent">•</span>
                        {takeaway}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {/* Navigation */}
          {!isQuizSection && (
            <div className="flex items-center justify-between mt-12 pt-8 border-t border-surface-3">
              <button
                onClick={handlePrev}
                disabled={currentSection === 0}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  currentSection === 0
                    ? 'text-gray-600 cursor-not-allowed'
                    : 'text-gray-300 hover:text-white hover:bg-surface-2'
                }`}
              >
                <ChevronLeft className="w-5 h-5" />
                Previous
              </button>
              
              <span className="text-sm text-gray-500">
                {currentSection + 1} / {lesson.sections.length + 1}
              </span>
              
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-500 transition-colors"
              >
                {currentSection === lesson.sections.length - 1 ? 'Take Quiz' : 'Next'}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Resources */}
          {!isQuizSection && lesson.resources && lesson.resources.length > 0 && (
            <div className="mt-12 pt-8 border-t border-surface-3">
              <h3 className="text-lg font-semibold text-white mb-4">Additional Resources</h3>
              <div className="grid gap-3">
                {lesson.resources.map((resource, index) => (
                  <a
                    key={index}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card card-hover p-4 flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-surface-3 flex items-center justify-center text-gray-400">
                      {resource.type === 'video' && '🎬'}
                      {resource.type === 'article' && '📄'}
                      {resource.type === 'book' && '📚'}
                      {resource.type === 'course' && '🎓'}
                      {resource.type === 'interactive' && '🎮'}
                      {resource.type === 'paper' && '📑'}
                    </div>
                    <div className="flex-grow">
                      <h4 className="text-white font-medium">{resource.title}</h4>
                      <span className="text-sm text-gray-500 capitalize">{resource.type}</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-500" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Lesson Navigation */}
          <div className="mt-12 pt-8 border-t border-surface-3 flex items-center justify-between">
            {lesson.previousLesson ? (
              <Link
                href={`/topic/${topic.id}/lesson/${lesson.previousLesson}`}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
                Previous Lesson
              </Link>
            ) : (
              <div />
            )}
            
            {lesson.nextLesson && (
              <Link
                href={`/topic/${topic.id}/lesson/${lesson.nextLesson}`}
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                Next Lesson
                <ChevronRight className="w-5 h-5" />
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

