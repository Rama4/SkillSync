'use client';

import {useState, useEffect} from 'react';
import Header from '@/components/Header';
import LessonContent from '@/components/LessonContent';
import LessonSidebar from '@/components/LessonSidebar';
import SectionEditor from '@/components/SectionEditor';
import {TopicMeta, Lesson, LessonSection} from '@/lib/types';
import {useProgressStore} from '@/lib/store';
import {ChevronLeft, ChevronRight, CheckCircle, ExternalLink, Menu, X, Plus, Edit2, Trash2} from 'lucide-react';
import DeleteDialog from '@/components/DeleteDialog';

interface LessonViewProps {
  topic: TopicMeta;
  lesson: Lesson;
}

import {DndProvider} from 'react-dnd';
import {HTML5Backend} from 'react-dnd-html5-backend';

export default function LessonView({topic, lesson: initialLesson}: LessonViewProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const [showSidebar, setShowSidebar] = useState(false);
  const [lesson, setLesson] = useState<Lesson>(initialLesson);
  const [showSectionEditor, setShowSectionEditor] = useState(false);
  const [editingSection, setEditingSection] = useState<LessonSection | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);
  const {isLessonComplete} = useProgressStore();

  const isComplete = isLessonComplete(topic.id, lesson.id);

  // Reload lesson when sections change
  useEffect(() => {
    if (showSectionEditor) return; // Don't reload while editing

    fetch(`/api/topics/${topic.id}/lessons/${lesson.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.lesson) {
          setLesson(data.lesson);
          // Adjust current section if it's out of bounds
          if (currentSection >= data.lesson.sections.length && data.lesson.sections.length > 0) {
            setCurrentSection(Math.max(0, data.lesson.sections.length - 1));
          }
        }
      })
      .catch(err => console.error('Error loading lesson:', err));
  }, [showSectionEditor]);

  const handleSectionSave = (section: LessonSection) => {
    setShowSectionEditor(false);
    setEditingSection(null);
    // Lesson will be reloaded via useEffect
  };

  const handleDeleteSection = async (sectionId: string) => {
    try {
      const response = await fetch(`/api/topics/${topic.id}/lessons/${lesson.id}/sections/${sectionId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete section');
      setShowDeleteDialog(false);
      setDeletingSectionId(null);
      // Lesson will be reloaded via useEffect
    } catch (error) {
      console.error('Error deleting section:', error);
      alert('Failed to delete section');
    }
  };

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
    <DndProvider backend={HTML5Backend}>
      <div className="h-screen flex flex-col">
        <Header />

        {/* Sidebar */}
        <LessonSidebar
          isOpen={showSidebar}
          onClose={() => setShowSidebar(false)}
          topicId={topic.id}
          topicTitle={topic.title}
          lessons={topic.lessons}
          currentLessonId={lesson.id}
          sections={lesson.sections || []}
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
        <main className="flex-1 flex max-w-7xl mx-auto w-full flex-col pt-12 overflow-y-auto min-h-0">
          <div className="flex flex-col mx-auto px-4 sm:px-6 lg:px-8 py-4 pb-64 max-w-4xl w-full">
            {/* Lesson Header */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  {isComplete && (
                    <span className="flex items-center gap-1 text-green-400">
                      <CheckCircle className="w-3 h-3" />
                      Completed
                    </span>
                  )}
                </div>
                {!showSectionEditor && (
                  <button
                    onClick={() => {
                      setEditingSection(null);
                      setShowSectionEditor(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs transition-colors">
                    <Plus className="w-3.5 h-3.5" />
                    Add Section
                  </button>
                )}
              </div>
              <h1 className="text-xl font-bold font-display text-white mb-2">{lesson.title}</h1>
            </div>

            {showSectionEditor ? (
              <div className="mb-6">
                <SectionEditor
                  section={editingSection}
                  topicId={topic.id}
                  lessonId={lesson.id}
                  onSave={handleSectionSave}
                  onCancel={() => {
                    setShowSectionEditor(false);
                    setEditingSection(null);
                  }}
                />
              </div>
            ) : (
              <>
                {lesson.sections.length > 0 && (
                  <div className="mb-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {lesson.sections.map((section, index) => (
                        <button
                          key={section.id}
                          onClick={() => setCurrentSection(index)}
                          className={`px-3 py-1 rounded-lg text-xs transition-colors ${
                            index === currentSection
                              ? 'bg-primary-500/20 text-primary-400 font-semibold'
                              : 'bg-surface-2 text-gray-400 hover:text-white'
                          }`}>
                          {section.title}
                        </button>
                      ))}
                    </div>
                    {lesson.sections[currentSection] && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingSection(lesson.sections[currentSection]);
                            setShowSectionEditor(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-white transition-colors"
                          title="Edit section">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingSectionId(lesson.sections[currentSection].id);
                            setShowDeleteDialog(true);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                          title="Delete section">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {lesson.sections.length > 0 && currentSection < lesson.sections.length ? (
                  <LessonContent section={lesson.sections[currentSection]} />
                ) : (
                  <div className="text-center py-8 text-gray-400 text-sm">
                    No sections yet. Click "Add Section" to create one.
                  </div>
                )}
              </>
            )}

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
        <DeleteDialog
          open={showDeleteDialog}
          onOpenChange={setShowDeleteDialog}
          onDelete={() => {
            if (deletingSectionId) {
              handleDeleteSection(deletingSectionId);
            }
          }}
          description="Are you sure you want to delete this section? This action cannot be undone."
          title="Delete Section?"
        />
        {/* Navigation */}
        <div className="fixed bottom-0 w-full border-y border-border-primary justify-center py-4 bg-surface-0">
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
        </div>
      </div>
    </DndProvider>
  );
}
