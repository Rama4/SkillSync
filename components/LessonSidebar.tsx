'use client';

import type React from 'react';

import {useState} from 'react';
import Link from 'next/link';
import type {LessonMeta, LessonSection} from '@/lib/types';
import {useProgressStore} from '@/lib/store';
import {CheckCircle, Circle, Clock, BookOpen, ChevronLeft, X, ChevronRight, Edit2, GripVertical, Check} from 'lucide-react';
import NotesPanel from './NotesPanel';
import SortableList from './dnd/SortableList';
import { useRouter } from 'next/navigation';

interface LessonSidebarProps {
  topicId: string;
  topicTitle: string;
  lessons: LessonMeta[];
  currentLessonId: string;
  sections: LessonSection[];
  currentSectionIndex: number;
  onSectionChange: (index: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function LessonSidebar({
  topicId,
  topicTitle,
  lessons,
  currentLessonId,
  sections,
  currentSectionIndex,
  onSectionChange,
  isOpen,
  onClose,
}: LessonSidebarProps) {
  const {isLessonComplete} = useProgressStore();
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isEditingSections, setIsEditingSections] = useState(false);
  const [localSections, setLocalSections] = useState<LessonSection[]>(sections);
  const router = useRouter();

  console.log('lessonsidebar', 'rendering')

  const saveSectionOrder = async () => {
    try {
      const response = await fetch(`/api/topics/${topicId}/lessons/${currentLessonId}/sections`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sections: localSections }),
      });

      if (!response.ok) {
        throw new Error('Failed to update sections');
      }

      setIsEditingSections(false);
      router.refresh();
    } catch (error) {
      console.error('Error saving section order:', error);
      alert('Failed to save section order');
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    console.log('Touch start', e.targetTouches[0].clientX);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    console.log('Touch move', e.targetTouches[0].clientX);
    const currentTouch = e.targetTouches[0].clientX;
    const diff = touchStart - currentTouch;

    if (diff > 50) {
      console.log('Touch move', e.targetTouches[0].clientX);
      onClose();
      setTouchStart(null);
    }
  };

  const handleSectionClick = (index: number) => {
    onSectionChange(index);
    if (window.innerWidth < 1024) onClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className={`
          fixed left-0 top-0 lg:top-12 z-50 lg:z-30
          ${isCollapsed ? 'w-12' : 'w-[380px]'} h-full lg:h-[calc(100vh-3rem)] bg-surface-1 border-r-[4px] border-gray-400 
          transition-all duration-300 ease-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
          lg:translate-x-0 overflow-y-auto pt-3 pb-12 shadow-2xl lg:shadow-none
        `}
          onClick={()=>isCollapsed && setIsCollapsed(false)}
        >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute right-0 top-[50%] z-10 w-6 h-6 items-center justify-center  
          bg-surface-2 border border-surface-3 text-gray-400 hover:text-white hover:bg-surface-3 transition-colors"
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {isCollapsed ? <ChevronRight className="w-10 h-10" /> : <ChevronLeft className="w-10 h-10" />}
        </button>

        {!isCollapsed && (
          <>
            {/* Mobile Header with Close Icon */}
            <div className="flex items-center justify-between px-4 lg:hidden mb-4 pb-2 border-b border-surface-3">
              <span className="text-xs font-bold text-gray-400 uppercase">Navigation</span>
              <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Back to topic */}
            <div className="px-4 mb-4">
              <Link
                href={`/topic/${topicId}`}
                className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-xs font-medium">
                <ChevronLeft className="w-3 h-3" />
                Back to {topicTitle}
              </Link>
            </div>

            {/* Current lesson sections */}
            <div className="px-3 mb-4">
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                  Lesson Sections
                </h3>
                {!isEditingSections ? (
                  <button 
                    onClick={() => {
                      setLocalSections(sections);
                      setIsEditingSections(true);
                    }}
                    className="text-gray-500 hover:text-white transition-colors"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={saveSectionOrder}
                      className="text-green-500 hover:text-green-400 transition-colors"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={() => setIsEditingSections(false)}
                      className="text-red-500 hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
              
              <div className="space-y-1">
                {isEditingSections ? (
                  <SortableList
                    items={localSections}
                    onReorder={setLocalSections}
                    keyExtractor={(item) => item.id}
                    renderItem={(section, index) => (
                      <div className="w-full text-left px-3 py-1.5 rounded-lg text-xs bg-surface-2 text-gray-200 border border-gray-700 flex items-center justify-between cursor-move mb-1">
                        <span className="line-clamp-1">{section.title}</span>
                        <GripVertical className="w-3 h-3 text-gray-500" />
                      </div>
                    )}
                  />
                ) : (
                  <>
                  {sections.map((section, index) => (
                    <button
                      key={section.id}
                      onClick={() => handleSectionClick(index)}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all ${
                        index === currentSectionIndex
                          ? 'bg-primary-500/20 text-primary-400 font-semibold'
                          : 'text-gray-400 hover:bg-surface-2 hover:text-gray-200'
                      }`}>
                      <span className="line-clamp-1">{section.title}</span>
                    </button>
                  ))}
                  </>
                )}
                
                {!isEditingSections && (
                  <button
                    onClick={() => handleSectionClick(sections.length)}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2 ${
                      currentSectionIndex === sections.length
                        ? 'bg-primary-500/20 text-primary-400 font-semibold'
                        : 'text-gray-400 hover:bg-surface-2 hover:text-gray-200'
                    }`}>
                    <BookOpen className="w-3.5 h-3.5" />
                    Quiz
                  </button>
                )}
              </div>
            </div>

            {/* Notes Panel */}
            <div className="px-3 mb-4 border-t border-surface-3 pt-4">
              <NotesPanel topicId={topicId} lessonId={currentLessonId} />
            </div>

            {/* All lessons */}
            <div className="px-3">
              <h3 className="px-1 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Lessons</h3>
              <div className="space-y-1">
                {lessons.map((lesson, index) => {
                  const isComplete = isLessonComplete(topicId, lesson.id);
                  const isCurrent = lesson.id === currentLessonId;

                  return (
                    <Link
                      key={`${lesson.id}-${index}`}
                      href={`/topic/${topicId}/lesson/${lesson.id}`}
                      onClick={() => {
                        if (window.innerWidth < 1024) onClose();
                      }}
                      className={`block px-3 py-1.5 rounded-lg text-xs transition-all ${
                        isCurrent ? 'bg-primary-500/10 border border-primary-500/20' : 'hover:bg-surface-2'
                      }`}>
                      <div className="flex items-center gap-2">
                        {isComplete ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle
                            className={`w-3.5 h-3.5 flex-shrink-0 ${isCurrent ? 'text-primary-400' : 'text-gray-700'}`}
                          />
                        )}
                        <span
                          className={`flex-grow line-clamp-1 ${
                            isCurrent ? 'text-white font-semibold' : 'text-gray-400'
                          }`}>
                          {lesson.title}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
