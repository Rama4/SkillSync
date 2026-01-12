'use client';

import type {LessonSection} from '@/lib/types';
import {useState, useRef} from 'react';
import {X, Loader2, Check, Upload} from 'lucide-react';

interface SectionEditorProps {
  section?: LessonSection | null;
  topicId: string;
  lessonId: string;
  onSave: (section: LessonSection) => void;
  onCancel: () => void;
}

export default function SectionEditor({section, topicId, lessonId, onSave, onCancel}: SectionEditorProps) {
  const [title, setTitle] = useState(section?.title || '');
  const [type, setType] = useState<'content' | 'code' | 'exercise' | 'video' | 'markdown' | 'file' | 'image'>(
    section?.type || 'content',
  );
  const [content, setContent] = useState(section?.content || '');
  const [filePath, setFilePath] = useState(section?.filePath || '');
  const [codeLanguage, setCodeLanguage] = useState(section?.codeLanguage || '');
  const [videoUrl, setVideoUrl] = useState(section?.videoUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Extract filename from filePath for display
  const getDisplayFileName = () => {
    if (selectedFileName) return selectedFileName;
    if (filePath) {
      const parts = filePath.split('/');
      return parts[parts.length - 1];
    }
    return '';
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setSelectedFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`/api/topics/${topicId}/media/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }

      const data = await response.json();
      setFilePath(data.filePath);
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file');
      setSelectedFileName('');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    setIsSaving(true);

    try {
      const sectionData: Partial<LessonSection> = {
        title: title.trim(),
        type,
        content,
      };

      if (type === 'code' && codeLanguage) {
        sectionData.codeLanguage = codeLanguage;
      }

      if (type === 'video') {
        if (videoUrl) {
          sectionData.videoUrl = videoUrl;
        }
        if (filePath) {
          sectionData.filePath = filePath;
        }
      }

      if (type === 'image' || type === 'markdown' || type === 'file') {
        if (filePath) {
          sectionData.filePath = filePath;
          // fileType will be auto-detected by the API based on filePath
        }
      }

      let savedSection: LessonSection;

      if (section) {
        // Update existing section
        const response = await fetch(`/api/topics/${topicId}/lessons/${lessonId}/sections/${section.id}`, {
          method: 'PUT',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(sectionData),
        });

        if (!response.ok) throw new Error('Failed to update section');
        const data = await response.json();
        savedSection = data.section;
      } else {
        // Create new section
        const response = await fetch(`/api/topics/${topicId}/lessons/${lessonId}/sections`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(sectionData),
        });

        if (!response.ok) throw new Error('Failed to create section');
        const data = await response.json();
        savedSection = data.section;
      }

      onSave(savedSection);
    } catch (error) {
      console.error('Error saving section:', error);
      alert('Failed to save section');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-white text-sm">{section ? 'Edit Section' : 'New Section'}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="p-1.5 rounded-lg hover:bg-surface-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            title="Save section">
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
          placeholder="Section title"
          className="w-full px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Type</label>
        <select
          value={type}
          onChange={e =>
            setType(e.target.value as 'content' | 'code' | 'exercise' | 'video' | 'markdown' | 'file' | 'image')
          }
          className="w-full px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm">
          <option value="content">Content</option>
          <option value="code">Code</option>
          <option value="exercise">Exercise</option>
          <option value="video">Video</option>
          <option value="markdown">Markdown</option>
          <option value="image">Image</option>
          <option value="file">File</option>
        </select>
      </div>

      {type === 'code' && (
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Code Language</label>
          <input
            type="text"
            value={codeLanguage}
            onChange={e => setCodeLanguage(e.target.value)}
            placeholder="javascript, python, etc."
            className="w-full px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          />
        </div>
      )}

      {(type === 'video' || type === 'image' || type === 'markdown' || type === 'file') && (
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Media File</label>
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              disabled={isUploading}
              className="hidden"
              id="media-file-input"
              accept={
                type === 'video'
                  ? 'video/*'
                  : type === 'image'
                  ? 'image/*'
                  : type === 'markdown'
                  ? '.md,.markdown'
                  : '*/*'
              }
            />
            <label
              htmlFor="media-file-input"
              className={`flex items-center gap-2 px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg cursor-pointer hover:bg-surface-3 transition-colors ${
                isUploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}>
              <Upload className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-white">
                {isUploading ? 'Uploading...' : getDisplayFileName() || 'Choose file'}
              </span>
              {isUploading && <Loader2 className="w-4 h-4 animate-spin text-gray-400 ml-auto" />}
            </label>
            {filePath && (
              <div className="text-xs text-gray-500 font-mono bg-surface-2 px-2 py-1 rounded">{filePath}</div>
            )}
          </div>
        </div>
      )}

      {type === 'video' && (
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Video URL (optional, if not using file path)</label>
          <input
            type="text"
            value={videoUrl}
            onChange={e => setVideoUrl(e.target.value)}
            placeholder="https://..."
            className="w-full px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          />
        </div>
      )}

      {(type === 'content' || type === 'markdown' || type === 'code' || type === 'exercise') && (
        <div>
          <label className="block text-xs text-gray-400 mb-1.5">Content</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={
              type === 'code' ? 'Code content...' : type === 'markdown' ? 'Markdown content...' : 'Section content...'
            }
            rows={8}
            className="w-full px-3 py-2 bg-surface-2 border border-surface-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono text-xs"
          />
        </div>
      )}
    </div>
  );
}
