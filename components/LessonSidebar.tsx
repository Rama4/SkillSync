"use client";

import Link from "next/link";
import { LessonMeta, LessonSection } from "@/lib/types";
import { useProgressStore } from "@/lib/store";
import {
  CheckCircle,
  Circle,
  Clock,
  BookOpen,
  ChevronLeft,
} from "lucide-react";
import NotesPanel from "./NotesPanel";

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
    <aside className="w-64 bg-surface-1 border-r border-surface-3 h-screen overflow-y-auto fixed left-0 top-12 pt-3 pb-12 hidden lg:block">
      {/* Back to topic */}
      <div className="px-3 mb-4">
        <Link
          href={`/topic/${topicId}`}
          className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-xs"
        >
          <ChevronLeft className="w-3 h-3" />
          Back to {topicTitle}
        </Link>
      </div>

      {/* Current lesson sections */}
      <div className="px-3 mb-4">
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
          Current Lesson
        </h3>
        <div className="space-y-0.5">
          {sections.map((section, index) => (
            <button
              key={section.id}
              onClick={() => onSectionChange(index)}
              className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                index === currentSectionIndex
                  ? "bg-primary-500/10 text-primary-400"
                  : "text-gray-400 hover:bg-surface-2 hover:text-white"
              }`}
            >
              <span className="line-clamp-1">{section.title}</span>
            </button>
          ))}
          <button
            onClick={() => onSectionChange(sections.length)}
            className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5 ${
              currentSectionIndex === sections.length
                ? "bg-primary-500/10 text-primary-400"
                : "text-gray-400 hover:bg-surface-2 hover:text-white"
            }`}
          >
            <BookOpen className="w-3 h-3" />
            Quiz
          </button>
        </div>
      </div>

      {/* Notes Panel */}
      <div className="px-3 mb-4 border-t border-surface-3 pt-3">
        <NotesPanel topicId={topicId} lessonId={currentLessonId} />
      </div>

      {/* All lessons */}
      <div className="px-3">
        <h3 className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
          All Lessons
        </h3>
        <div className="space-y-0.5">
          {lessons.map((lesson) => {
            const isComplete = isLessonComplete(topicId, lesson.id);
            const isCurrent = lesson.id === currentLessonId;

            return (
              <Link
                key={lesson.id}
                href={`/topic/${topicId}/lesson/${lesson.id}`}
                className={`block px-2 py-1.5 rounded text-xs transition-colors ${
                  isCurrent
                    ? "bg-primary-500/10 border border-primary-500/30"
                    : "hover:bg-surface-2"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {isComplete ? (
                    <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                  ) : (
                    <Circle
                      className={`w-3 h-3 flex-shrink-0 ${
                        isCurrent ? "text-primary-400" : "text-gray-600"
                      }`}
                    />
                  )}
                  <span
                    className={`flex-grow line-clamp-1 ${
                      isCurrent ? "text-white font-medium" : "text-gray-400"
                    }`}
                  >
                    {lesson.title}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5 ml-4 text-[10px] text-gray-600">
                  <Clock className="w-2.5 h-2.5" />
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
