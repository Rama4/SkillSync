'use client';

import {useState} from 'react';
import Header from '@/components/Header';
import LessonContent from '@/components/LessonContent';
import LessonSidebar from '@/components/LessonSidebar';
import {TopicMeta, Lesson} from '@/lib/types';
import {useProgressStore} from '@/lib/store';
import {ChevronLeft, ChevronRight, CheckCircle, ExternalLink, Menu, X} from 'lucide-react';

interface LessonViewProps {
  topic: TopicMeta;
  lesson: Lesson;
}

export default function LessonView({topic, lesson}: LessonViewProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const {isLessonComplete} = useProgressStore();

  const isComplete = isLessonComplete(topic.id, lesson.id);

  const handleNext = () => {
    if (currentSection < lesson.sections.length) {
      setCurrentSection(currentSection + 1);
      window.scrollTo({top: 0, behavior: 'smooth'});
    }
  };

  const handlePrev = () => {
    if (currentSection > 0) {
      setCurrentSection(currentSection - 1);
      window.scrollTo({top: 0, behavior: 'smooth'});
    }
  };

  return (
    <div className="h-screen">
      <Header />

      {/* Sidebar */}
      <LessonSidebar
        isOpen={showSidebar}
        onClose={() => setShowSidebar(false)}
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
        className="lg:hidden fixed bottom-4 left-4 z-50 w-10 h-10 rounded-full bg-primary-600 text-white shadow-lg shadow-primary-500/30 flex items-center justify-center">
        {showSidebar ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Main Content */}
      <main className="flex max-w-7xl mx-auto h-full flex-col py-12">
        <div className="flex flex-col mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Lesson Header */}
          <div className="mb-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              {isComplete && (
                <span className="flex items-center gap-1 text-green-400">
                  <CheckCircle className="w-3 h-3" />
                  Completed
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold font-display text-white mb-2">{lesson.title}</h1>
          </div>

          <LessonContent section={lesson.sections[currentSection]} />

          {/* Resources */}
          {lesson?.resources?.length > 0 && (
            <div className="mt-6 pt-4 border-t border-surface-3">
              <h3 className="text-sm font-semibold text-white mb-2">Additional Resources</h3>
              <div className="grid gap-2">
                {lesson.resources.map((resource, index) => (
                  <a
                    key={index}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card card-hover p-2.5 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-surface-3 flex items-center justify-center text-gray-400 text-sm">
                      {resource.type === 'video' && '🎬'}
                      {resource.type === 'article' && '📄'}
                      {resource.type === 'book' && '📚'}
                      {resource.type === 'course' && '🎓'}
                      {resource.type === 'interactive' && '🎮'}
                      {resource.type === 'paper' && '📑'}
                    </div>
                    <div className="flex-grow">
                      <h4 className="text-white font-medium text-sm">{resource.title}</h4>
                      <span className="text-xs text-gray-500 capitalize">{resource.type}</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-gray-500" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      {/* Navigation */}
      {/* <div className="fixed bottom-0 w-full border-2 border-blue-500 justify-center">
        <div className="flex w-72 mx-auto items-center gap-10">
          <button
            onClick={handlePrev}
            disabled={currentSection === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              currentSection === 0
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-300 hover:text-white hover:bg-surface-2'
            }`}>
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <span className="text-xs text-gray-500">
            {currentSection + 1} / {lesson.sections.length}
          </span>

          <button
            onClick={handleNext}
            disabled={currentSection === Math.max(lesson.sections.length - 1, 0)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
              currentSection === Math.max(lesson.sections.length - 1, 0)
                ? 'text-gray-600 cursor-not-allowed'
                : 'text-gray-300 hover:text-white hover:bg-surface-2'
            }`}>
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div> */}
    </div>
  );
}
