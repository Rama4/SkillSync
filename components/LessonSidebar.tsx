'use client';

import Link from 'next/link';
import { LessonMeta, LessonSection } from '@/lib/types';
import { useProgressStore } from '@/lib/store';
import { CheckCircle, Circle, Clock, BookOpen, ChevronLeft } from 'lucide-react';

interface LessonSidebarProps {
  topicId: string;
  topicTitle: string;
  lessons: LessonMeta[];
  currentLessonId: string;
  sections: LessonSection[];
  currentSectionIndex: number;
  onSectionChange: (index: number) => void;
}

export default function LessonSidebar({
  topicId,
  topicTitle,
  lessons,
  currentLessonId,
  sections,
  currentSectionIndex,
  onSectionChange,
}: LessonSidebarProps) {
  const { isLessonComplete } = useProgressStore();

  return (
    <aside className="w-80 bg-surface-1 border-r border-surface-3 h-screen overflow-y-auto fixed left-0 top-16 pt-6 pb-20 hidden lg:block">
      {/* Back to topic */}
      <div className="px-4 mb-6">
        <Link 
          href={`/topic/${topicId}`}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to {topicTitle}
        </Link>
      </div>

      {/* Current lesson sections */}
      <div className="px-4 mb-8">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Current Lesson
        </h3>
        <div className="space-y-1">
          {sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => onSectionChange(index)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                index === currentSectionIndex
                  ? 'bg-primary-500/10 text-primary-400'
                  : 'text-gray-400 hover:bg-surface-2 hover:text-white'
              }`}
            >
              <span className="line-clamp-1">{section.title}</span>
            </button>
          ))}
          <button
            onClick={() => onSectionChange(sections.length)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
              currentSectionIndex === sections.length
                ? 'bg-primary-500/10 text-primary-400'
                : 'text-gray-400 hover:bg-surface-2 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Quiz
          </button>
        </div>
      </div>

      {/* All lessons */}
      <div className="px-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          All Lessons
        </h3>
        <div className="space-y-1">
          {lessons.map((lesson) => {
            const isComplete = isLessonComplete(topicId, lesson.id);
            const isCurrent = lesson.id === currentLessonId;

            return (
              <Link
                key={lesson.id}
                href={`/topic/${topicId}/lesson/${lesson.id}`}
                className={`block px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isCurrent
                    ? 'bg-primary-500/10 border border-primary-500/30'
                    : 'hover:bg-surface-2'
                }`}
              >
                <div className="flex items-center gap-2">
                  {isComplete ? (
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle className={`w-4 h-4 flex-shrink-0 ${isCurrent ? 'text-primary-400' : 'text-gray-600'}`} />
                  )}
                  <span className={`flex-grow line-clamp-1 ${
                    isCurrent ? 'text-white font-medium' : 'text-gray-400'
                  }`}>
                    {lesson.title}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1 ml-6 text-xs text-gray-600">
                  <Clock className="w-3 h-3" />
                  {lesson.duration}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

