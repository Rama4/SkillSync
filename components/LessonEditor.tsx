'use client';

import type {Lesson} from '@/lib/types';
import {useState} from 'react';
import {X, Loader2, Check} from 'lucide-react';

interface LessonEditorProps {
  lesson?: Lesson | null;
  topicId: string;
  onSave: (lesson: Lesson) => void;
  onCancel: () => void;
}

export default function LessonEditor({lesson, topicId, onSave, onCancel}: LessonEditorProps) {
  const [title, setTitle] = useState(lesson?.title || '');
  const [objectives, setObjectives] = useState<string[]>(lesson?.objectives || []);
  const [newObjective, setNewObjective] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleAddObjective = () => {
    if (newObjective.trim()) {
      setObjectives([...objectives, newObjective.trim()]);
      setNewObjective('');
    }
  };

  const handleRemoveObjective = (index: number) => {
    setObjectives(objectives.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    setIsSaving(true);

    try {
      const lessonData = {
        title: title.trim(),
        objectives,
      };

      let savedLesson: Lesson;

      if (lesson) {
        // Update existing lesson
        const response = await fetch(`/api/topics/${topicId}/lessons/${lesson.id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(lessonData),
        });

        if (!response.ok) throw new Error('Failed to update lesson');
        const data = await response.json();
        savedLesson = data.lesson;
      } else {
        // Create new lesson
        const response = await fetch(`/api/topics/${topicId}/lessons`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(lessonData),
        });

        if (!response.ok) throw new Error('Failed to create lesson');
        const data = await response.json();
        savedLesson = data.lesson;
      }

      onSave(savedLesson);
    } catch (error) {
      console.error('Error saving lesson:', error);
      alert('Failed to save lesson');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white text-sm">{lesson ? 'Edit Lesson' : 'New Lesson'}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-1.5 rounded-lg hover:bg-surface-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            title="Save lesson">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </button>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg hover:bg-surface-2 text-gray-400 hover:text-white transition-colors"
            title="Cancel">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Title</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Lesson title"
          className="w-full px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Objectives</label>
        <div className="space-y-2">
          {objectives.map((objective, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={objective}
                onChange={e => {
                  const newObjectives = [...objectives];
                  newObjectives[index] = e.target.value;
                  setObjectives(newObjectives);
                }}
                className="flex-1 px-3 py-1.5 bg-surface-2 border border-surface-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
              <button
                onClick={() => handleRemoveObjective(index)}
                className="p-1.5 text-gray-400 hover:text-red-400 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newObjective}
              onChange={e => setNewObjective(e.target.value)}
              onKeyPress={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddObjective();
                }
              }}
              placeholder="Add objective..."
              className="flex-1 px-3 py-1.5 bg-surface-2 border border-surface-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
            />
            <button
              onClick={handleAddObjective}
              className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white text-xs rounded-lg transition-colors">
              Add
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
