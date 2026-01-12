'use client';

import {useState, useEffect} from 'react';
import Link from 'next/link';
import type {Lesson} from '@/lib/types';
import {Clock, ChevronRight, Plus} from 'lucide-react';
import LessonEditor from './LessonEditor';

interface LessonsListProps {
  topicId: string;
  initialLessons: Lesson[];
}

export default function LessonsList({topicId, initialLessons}: LessonsListProps) {
  const [lessons, setLessons] = useState<Lesson[]>(initialLessons);
  const [showEditor, setShowEditor] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);

  const handleSave = (lesson: Lesson) => {
    setLessons(prev => {
      const exists = prev.find(l => l.id === lesson.id);
      if (exists) {
        return prev.map(l => (l.id === lesson.id ? lesson : l));
      }
      return [...prev, lesson].sort((a, b) => a.order - b.order);
    });
    setShowEditor(false);
    setEditingLesson(null);
    // Reload page to reflect changes
    window.location.reload();
  };

  const handleNewLesson = () => {
    setEditingLesson(null);
    setShowEditor(true);
  };

  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold font-display text-white">Course Content</h2>
        <div className="flex items-center gap-2">
          {!showEditor && (
            <button
              onClick={handleNewLesson}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition-colors">
              <Plus className="w-4 h-4" />
              Add Lesson
            </button>
          )}
        </div>
      </div>

      {showEditor ? (
        <div className="mb-4">
          <LessonEditor
            lesson={editingLesson}
            topicId={topicId}
            onSave={handleSave}
            onCancel={() => {
              setShowEditor(false);
              setEditingLesson(null);
            }}
          />
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {lessons.map((lesson, index) => (
              <Link
                key={lesson.id}
                href={`/topic/${topicId}/lesson/${lesson.id}`}
                className="card card-hover p-3 flex items-center gap-3 group">
                {/* Lesson number */}
                <div className="w-7 h-7 rounded-lg bg-surface-3 flex items-center justify-center text-gray-400 text-sm font-semibold group-hover:bg-primary-500/20 group-hover:text-primary-400 transition-colors">
                  {index + 1}
                </div>

                {/* Content */}
                <div className="flex flex-row items-center justify-between w-full min-w-0">
                  <h3 className="text-sm font-semibold text-white group-hover:text-primary-400 transition-colors mb-0.5 truncate">
                    {lesson.title}
                  </h3>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-primary-400 group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>

          {lessons.length === 0 && (
            <div className="text-center py-8 card">
              <h3 className="text-base font-semibold text-white mb-1.5">No Lessons Yet</h3>
              <p className="text-gray-400 text-sm">Click &quot;Add Lesson&quot; to create your first lesson.</p>
            </div>
          )}
        </>
      )}
    </>
  );
}
