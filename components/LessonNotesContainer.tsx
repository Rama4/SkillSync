'use client';

import {useState} from 'react';
import {useDrop} from 'react-dnd';
import type {Lesson, Note} from '@/lib/types';
import {ChevronDown, ChevronRight, FileText} from 'lucide-react';
import {cn} from '@/lib/utils';
import DraggableNoteCard from '@/components/DraggableNoteCard';
import DropPlaceholder from '@/components/DropPlaceholder';

interface LessonNotesContainerProps {
  lesson: Lesson;
  notes: Note[];
  onMoveNote: (noteId: string, toLessonId: string) => void;
  onReorderNotes: (lessonId: string, reorderedNotes: Note[]) => void;
}

const ITEM_TYPE = 'NOTE';

export default function LessonNotesContainer({lesson, notes, onMoveNote, onReorderNotes}: LessonNotesContainerProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const [{isOver, canDrop}, drop] = useDrop(
    () => ({
      accept: ITEM_TYPE,
      drop: (item: {id: string; lessonId: string}) => {
        if (item.lessonId !== lesson.id) {
          onMoveNote(item.id, lesson.id);
        }
      },
      canDrop: (item: {id: string; lessonId: string}) => {
        return item.lessonId !== lesson.id;
      },
      collect: monitor => ({
        isOver: monitor.isOver(),
        canDrop: monitor.canDrop(),
      }),
    }),
    [lesson.id, onMoveNote],
  );

  const handleDropAtPosition = (noteId: string, targetIndex: number) => {
    const draggedNoteIndex = notes.findIndex(n => n.id === noteId);
    const isFromSameLesson = draggedNoteIndex !== -1;

    if (!isFromSameLesson) {
      onMoveNote(noteId, lesson.id);
      // After moving, we need to reorder to put it at the right position
      // This will be handled by the parent component
      return;
    }

    const newNotes = [...notes];
    const [draggedNote] = newNotes.splice(draggedNoteIndex, 1);

    // Adjust target index if needed
    const insertIndex = draggedNoteIndex < targetIndex ? targetIndex - 1 : targetIndex;

    newNotes.splice(insertIndex, 0, draggedNote);
    onReorderNotes(lesson.id, newNotes);
  };

  return (
    <div className="border border-border rounded-lg bg-card overflow-hidden">
      {/* Lesson Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-accent transition-colors">
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
        <div className="flex-grow flex items-center justify-between min-w-0">
          <div className="flex items-center gap-3 min-w-0">
            <h3 className="text-base font-semibold text-foreground truncate">{lesson.title}</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0 ml-4">
            <FileText className="w-3 h-3" />
            <span>
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </span>
          </div>
        </div>
      </button>

      {/* Notes List */}
      {isExpanded && (
        <div
          ref={drop}
          className={cn(
            'p-4 min-h-[100px] transition-colors',
            isOver && canDrop && 'bg-primary/5 border-t-2 border-primary',
            canDrop && !isOver && 'bg-muted/30',
          )}>
          {notes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No notes yet</p>
              <p className="text-xs mt-1">Drag notes here to add them to this lesson</p>
            </div>
          ) : (
            <div className="space-y-0">
              {notes.map((note, index) => (
                <div key={note.id}>
                  <DropPlaceholder
                    lessonId={lesson.id}
                    index={index}
                    onDrop={handleDropAtPosition}
                    acceptFromSameLesson={true}
                  />
                  <DraggableNoteCard note={note} index={index} />
                </div>
              ))}
              <DropPlaceholder
                lessonId={lesson.id}
                index={notes.length}
                onDrop={handleDropAtPosition}
                acceptFromSameLesson={true}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
