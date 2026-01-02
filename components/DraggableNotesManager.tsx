'use client';

import {useState} from 'react';
import {DndProvider} from 'react-dnd';
import {HTML5Backend} from 'react-dnd-html5-backend';
import type {Lesson, Note} from '@/lib/types';
import LessonNotesContainer from '@/components/LessonNotesContainer';
import {getAudioPlayerUrl} from '@/lib/noteUtils';

interface DraggableNotesManagerProps {
  lessons: Lesson[];
  initialNotes: Note[];
  topicId: string;
}

export default function DraggableNotesManager({lessons, initialNotes, topicId}: DraggableNotesManagerProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);

  const moveNote = (noteId: string, toLessonId: string) => {
    setNotes(prevNotes => prevNotes.map(note => (note.id === noteId ? {...note, lessonId: toLessonId} : note)));
  };

  const reorderNotesInLesson = (lessonId: string, reorderedNotes: Note[]) => {
    setNotes(prevNotes => {
      // Remove old notes from this lesson
      const otherNotes = prevNotes.filter(n => n.lessonId !== lessonId);
      // Add reordered notes
      return [...otherNotes, ...reorderedNotes];
    });
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-3">
        {lessons.map(lesson => {
          const lessonNotes = notes.filter(n => n.lessonId === lesson.id);
          // populate the audio file url for each note
          for (const note of lessonNotes) {
            if (note.audioFile) {
              const audioUrl = getAudioPlayerUrl(topicId, lesson.id, note.id) as string;
              note.audioFile = audioUrl;
            }
          }
          return (
            <LessonNotesContainer
              key={lesson.id}
              lesson={lesson}
              notes={lessonNotes}
              onMoveNote={moveNote}
              onReorderNotes={reorderNotesInLesson}
            />
          );
        })}
      </div>
    </DndProvider>
  );
}
