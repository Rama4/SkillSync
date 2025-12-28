'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { MediaFile } from '@/lib/types';
import { ChevronUp, ChevronDown, X, Plus, FileVideo, FileText, File, Loader2 } from 'lucide-react';

export default function RegisterTopicPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  
  // File management
  const [availableFiles, setAvailableFiles] = useState<MediaFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<MediaFile[]>([]);
  const [scanDirectory, setScanDirectory] = useState('test');
  
  // Load available files
  useEffect(() => {
    loadAvailableFiles();
  }, [scanDirectory]);
  
  const loadAvailableFiles = async () => {
    setScanning(true);
    try {
      const response = await fetch(`/api/topics?directory=${encodeURIComponent(scanDirectory)}`);
      if (response.ok) {
        const data = await response.json();
        setAvailableFiles(data.files || []);
      } else {
        setError('Failed to load available files');
      }
    } catch (err) {
      setError('Error loading files');
    } finally {
      setScanning(false);
    }
  };
  
  const addFile = (file: MediaFile) => {
    if (!selectedFiles.find(f => f.path === file.path)) {
      setSelectedFiles([...selectedFiles, file]);
    }
  };
  
  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };
  
  const moveFile = (index: number, direction: 'up' | 'down') => {
    const newFiles = [...selectedFiles];
    if (direction === 'up' && index > 0) {
      [newFiles[index - 1], newFiles[index]] = [newFiles[index], newFiles[index - 1]];
    } else if (direction === 'down' && index < newFiles.length - 1) {
      [newFiles[index], newFiles[index + 1]] = [newFiles[index + 1], newFiles[index]];
    }
    setSelectedFiles(newFiles);
  };
  
  const getFileIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <FileVideo className="w-4 h-4" />;
      case 'markdown':
        return <FileText className="w-4 h-4" />;
      default:
        return <File className="w-4 h-4" />;
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    
    if (selectedFiles.length === 0) {
      setError('Please select at least one media file');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          tags: tags.split(',').map(t => t.trim()).filter(t => t),
          mediaFiles: selectedFiles,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess(`Topic "${title}" registered successfully!`);
        setTimeout(() => {
          router.push(`/topic/${data.topicId}`);
        }, 1500);
      } else {
        setError(data.error || 'Failed to register topic');
      }
    } catch (err) {
      setError('Error registering topic');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <main className="min-h-screen">
      <Header />
      
      <div className="pt-16 pb-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold font-display text-white mb-1">
            Register New Topic
          </h1>
          <p className="text-gray-400 text-sm mb-4">
            Create a new learning topic with videos, markdown files, and other media
          </p>
          
          {/* Success/Error Messages */}
          {success && (
            <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 text-sm">
              {success}
            </div>
          )}
          
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Topic Metadata */}
            <div className="card p-4 space-y-3">
              <h2 className="text-base font-semibold text-white">Topic Information</h2>
              
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-surface-2 border border-surface-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Language Modeling Fundamentals"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 text-sm bg-surface-2 border border-surface-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Describe what learners will learn in this topic..."
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm bg-surface-2 border border-surface-3 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="machine-learning, ai, neural-networks"
                />
              </div>
            </div>
            
            {/* Media Files Selection */}
            <div className="card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-white">Media Files</h2>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={scanDirectory}
                    onChange={(e) => setScanDirectory(e.target.value)}
                    placeholder="Directory name"
                    className="px-2 py-1 text-xs bg-surface-2 border border-surface-3 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={loadAvailableFiles}
                    disabled={scanning}
                    className="px-3 py-1 text-xs bg-surface-2 border border-surface-3 rounded text-white hover:bg-surface-3 transition-colors disabled:opacity-50"
                  >
                    {scanning ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Scan'}
                  </button>
                </div>
              </div>
              
              {/* Available Files */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-2">
                  Available Files ({availableFiles.length})
                </label>
                <div className="max-h-40 overflow-y-auto space-y-1.5 border border-surface-3 rounded-lg p-2 bg-surface-1">
                  {availableFiles.length === 0 ? (
                    <p className="text-gray-500 text-xs text-center py-3">
                      No files found in "{scanDirectory}" directory
                    </p>
                  ) : (
                    availableFiles.map((file) => (
                      <button
                        key={file.path}
                        type="button"
                        onClick={() => addFile(file)}
                        disabled={selectedFiles.some(f => f.path === file.path)}
                        className="w-full flex items-center gap-2 p-1.5 rounded bg-surface-2 hover:bg-surface-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
                      >
                        {getFileIcon(file.type)}
                        <span className="flex-1 text-xs text-white truncate">{file.name}</span>
                        <span className="text-[10px] text-gray-500 capitalize">{file.type}</span>
                        {selectedFiles.some(f => f.path === file.path) && (
                          <span className="text-[10px] text-green-400">Added</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
              
              {/* Selected Files (Ordered) */}
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-2">
                  Selected Files - Order ({selectedFiles.length})
                </label>
                {selectedFiles.length === 0 ? (
                  <div className="border border-surface-3 rounded-lg p-4 bg-surface-1 text-center">
                    <p className="text-gray-500 text-xs">
                      No files selected. Click files above to add them.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 border border-surface-3 rounded-lg p-2 bg-surface-1">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={`${file.path}-${index}`}
                        className="flex items-center gap-2 p-2 rounded bg-surface-2"
                      >
                        <div className="flex flex-col gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveFile(index, 'up')}
                            disabled={index === 0}
                            className="p-0.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveFile(index, 'down')}
                            disabled={index === selectedFiles.length - 1}
                            className="p-0.5 text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        </div>
                        
                        <div className="flex-1 flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-400 w-4">
                            {index + 1}
                          </span>
                          {getFileIcon(file.type)}
                          <span className="flex-1 text-xs text-white truncate">{file.name}</span>
                          <span className="text-[10px] text-gray-500 capitalize">{file.type}</span>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => removeFile(index)}
                          className="p-0.5 text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-1.5 text-sm rounded-lg bg-surface-2 border border-surface-3 text-white hover:bg-surface-3 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim() || selectedFiles.length === 0}
                className="flex-1 px-4 py-1.5 text-sm rounded-lg bg-gradient-to-r from-primary-600 to-primary-500 text-white font-semibold hover:from-primary-500 hover:to-primary-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Registering...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Register Topic
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}

