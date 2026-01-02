'use client';

import {useRef} from 'react';
import {useDrag} from 'react-dnd';
import type {Note} from '@/lib/types';
import {FileText, Music, Edit, Trash2} from 'lucide-react';
import {cn} from '@/lib/utils';
import AudioPlayer from '@/components/AudioPlayer';
import {getMarkdownPreview} from '@/lib/utils';

interface DraggableNoteCardProps {
  note: Note;
  index: number;
}

const ITEM_TYPE = 'NOTE';

export default function DraggableNoteCard({note, index}: DraggableNoteCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const [{isDragging}, drag] = useDrag(
    () => ({
      type: ITEM_TYPE,
      item: {id: note.id, lessonId: note.lessonId, index},
      collect: monitor => ({
        isDragging: monitor.isDragging(),
      }),
    }),
    [note.id, note.lessonId, index],
  );

  drag(ref);

  return (
    <div
      ref={ref}
      className={cn(
        'relative p-3 rounded-lg border border-border bg-card hover:shadow-md transition-all cursor-move my-2',
        isDragging && 'opacity-50 cursor-grabbing',
      )}>
      {/* Note Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0 flex-grow">
          {note.audioFile ? (
            <Music className="w-4 h-4 text-primary flex-shrink-0" />
          ) : (
            <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          )}
          <h4 className="text-sm font-semibold text-foreground truncate">{note.title}</h4>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button className="p-1 hover:bg-accent rounded transition-colors">
            <Edit className="w-3 h-3 text-muted-foreground" />
          </button>
          <button className="p-1 hover:bg-destructive/10 rounded transition-colors">
            <Trash2 className="w-3 h-3 text-destructive" />
          </button>
        </div>
      </div>

      {/* Note Content Preview */}
      {note.markdown && (
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{getMarkdownPreview(note.markdown)}</p>
      )}

      {/* Audio Player Mock */}
      {note.audioFile && <AudioPlayer audioUrl={note.audioFile} />}
    </div>
  );
}
