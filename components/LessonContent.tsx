'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {LessonSection} from '@/lib/types';
import {useState, useEffect} from 'react';
import AudioPlayer from './AudioPlayer';

interface LessonContentProps {
  section: LessonSection;
}

export default function LessonContent({section}: LessonContentProps) {
  const [markdownContent, setMarkdownContent] = useState<string>('');
  const [loadingMarkdown, setLoadingMarkdown] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [textContent, setTextContent] = useState<string>('');
  const [loadingText, setLoadingText] = useState(false);

  // Load content from file if needed
  useEffect(() => {
    if (typeof window === 'undefined') {
      setMarkdownContent(section.content || '');
      return;
    }

    const topicMatch = window.location.pathname.match(/\/topic\/([^/]+)/);
    const topicId = topicMatch ? topicMatch[1] : null;

    if (section.type === 'video' || (section.fileType === 'video' && section.filePath)) {
      // Extract topic ID from URL if videoUrl is not set
      let _videoUrl = section.videoUrl;
      if (!_videoUrl && section.filePath && topicId) {
        _videoUrl = `/api/media/${topicId}/${section.filePath}`;
      }
      console.log('video url:', _videoUrl);
      setVideoUrl(_videoUrl || '');
    } else if (section.type === 'image' || (section.fileType === 'image' && section.filePath)) {
      // Set image URL
      if (section.filePath && topicId) {
        setImageUrl(`/api/media/${topicId}/${section.filePath}`);
      }
    } else if (section.type === 'audio' || section.fileType === 'audio') {
      const relPath = section.audioPath || section.filePath;
      if (relPath && topicId) {
        setAudioUrl(`/api/media/${topicId}/${relPath}`);
      }
    } else if (section.fileType === 'text' && section.filePath && !section.content) {
      // Load text file content
      if (topicId) {
        setLoadingText(true);
        const mediaUrl = `/api/media/${topicId}/${section.filePath}`;
        fetch(mediaUrl)
          .then(res => res.text())
          .then(text => {
            setTextContent(text);
            setLoadingText(false);
          })
          .catch(err => {
            console.error('Error loading text file:', err);
            setTextContent(section.content || '');
            setLoadingText(false);
          });
      } else {
        setTextContent(section.content || '');
      }
    } else if (
      (section.type === 'markdown' || section.fileType === 'markdown') &&
      section.filePath &&
      !section.content
    ) {
      setLoadingMarkdown(true);
      if (topicId) {
        const mediaUrl = `/api/media/${topicId}/${section.filePath}`;
        fetch(mediaUrl)
          .then(res => res.text())
          .then(text => {
            setMarkdownContent(text);
            setLoadingMarkdown(false);
          })
          .catch(err => {
            console.error('Error loading markdown:', err);
            setMarkdownContent(section.content || '');
            setLoadingMarkdown(false);
          });
      } else {
        setMarkdownContent(section.content || '');
        setLoadingMarkdown(false);
      }
    } else {
      setMarkdownContent(section.content || '');
    }
  }, [section]);

  // Render video section
  if (section.type === 'video' || (section.fileType === 'video' && section.filePath)) {
    return (
      <div className="animate-fade-in">
        <h2 className="text-lg font-bold font-display text-white mb-3 flex items-center gap-2">
          <span className="w-0.5 h-6 bg-gradient-to-b from-primary-500 to-accent rounded-full" />
          {section.title}
        </h2>

        {videoUrl && (
          <div className="my-3">
            <video
              controls
              className="w-full rounded-lg bg-surface-0 border border-surface-3"
              style={{maxHeight: '500px'}}>
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {section.content && (
          <div className="prose max-w-none mt-3">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
          </div>
        )}
      </div>
    );
  }

  // Render image section
  if (section.type === 'image' || (section.fileType === 'image' && section.filePath)) {
    return (
      <div className="animate-fade-in">
        <h2 className="text-lg font-bold font-display text-white mb-3 flex items-center gap-2">
          <span className="w-0.5 h-6 bg-gradient-to-b from-primary-500 to-accent rounded-full" />
          {section.title}
        </h2>

        {imageUrl && (
          <div className="my-3">
            <div className="relative w-full rounded-lg bg-surface-0 border border-surface-3 overflow-hidden">
              <img
                src={imageUrl}
                alt={section.title}
                className="w-full h-auto max-h-[600px] object-contain"
                style={{maxHeight: '600px'}}
              />
            </div>
          </div>
        )}

        {section.content && (
          <div className="prose max-w-none mt-3">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
          </div>
        )}
      </div>
    );
  }

  // Render audio section
  if (section.type === 'audio' || section.fileType === 'audio') {
    return (
      <div className="animate-fade-in">
        <h2 className="text-lg font-bold font-display text-white mb-3 flex items-center gap-2">
          <span className="w-0.5 h-6 bg-gradient-to-b from-primary-500 to-accent rounded-full" />
          {section.title}
        </h2>

        {audioUrl ? (
          <div className="my-3">
            <AudioPlayer audioUrl={audioUrl} title={section.title} />
          </div>
        ) : (
          <div className="text-gray-400 text-sm py-4">No audio available for this section.</div>
        )}

        {section.content && (
          <div className="prose max-w-none mt-3">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.content}</ReactMarkdown>
          </div>
        )}
      </div>
    );
  }

  // Render text file section
  if (section.fileType === 'text' && (section.filePath || section.content)) {
    return (
      <div className="animate-fade-in flex flex-col gap-4">
        <h2 className="text-lg font-bold font-display text-white mb-3 flex items-center gap-2">
          <span className="w-0.5 h-6 bg-gradient-to-b from-primary-500 to-accent rounded-full" />
          {section.title}
        </h2>

        {loadingText ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-400 text-sm">Loading content...</div>
          </div>
        ) : (
          <div className="bg-surface-0 border border-surface-3 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">{textContent || section.content}</pre>
          </div>
        )}
      </div>
    );
  }

  // Render markdown file section
  if (section.type === 'markdown' || section.fileType === 'markdown') {
    return (
      <div className="animate-fade-in flex flex-col gap-4">
        <h2 className="text-lg font-bold font-display text-white mb-3 flex items-center gap-2">
          <span className="w-0.5 h-6 bg-gradient-to-b from-primary-500 to-accent rounded-full" />
          {section.title}
        </h2>

        {loadingMarkdown ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-400 text-sm">Loading content...</div>
          </div>
        ) : (
          <div className="prose max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Custom code block styling
                pre: ({children}) => (
                  <pre className="bg-surface-0 border border-surface-3 rounded-lg p-3 overflow-x-auto my-3 text-sm">
                    {children}
                  </pre>
                ),
                code: ({className, children, ...props}) => {
                  const isInline = !className;
                  if (isInline) {
                    return (
                      <code className="bg-surface-2 px-1 py-0.5 rounded text-primary-400 text-xs" {...props}>
                        {children}
                      </code>
                    );
                  }
                  return (
                    <code className="text-xs text-gray-300" {...props}>
                      {children}
                    </code>
                  );
                },
                // Custom table styling
                table: ({children}) => (
                  <div className="overflow-x-auto my-3">
                    <table className="w-full border-collapse text-sm">{children}</table>
                  </div>
                ),
                th: ({children}) => (
                  <th className="bg-surface-2 text-left p-2 font-semibold text-white border-b border-surface-4 text-xs">
                    {children}
                  </th>
                ),
                td: ({children}) => <td className="p-2 border-b border-surface-3 text-xs">{children}</td>,
                // Custom list styling
                ul: ({children}) => <ul className="my-2 ml-4 space-y-1">{children}</ul>,
                ol: ({children}) => <ol className="my-2 ml-4 space-y-1 list-decimal">{children}</ol>,
                li: ({children}) => <li className="text-gray-300 text-sm">{children}</li>,
                // Headings
                h1: ({children}) => <h1 className="text-xl font-bold font-display text-white mt-4 mb-2">{children}</h1>,
                h2: ({children}) => <h2 className="text-lg font-bold font-display text-white mt-4 mb-2">{children}</h2>,
                h3: ({children}) => (
                  <h3 className="text-base font-semibold font-display text-white mt-3 mb-2">{children}</h3>
                ),
                // Links
                a: ({href, children}) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-400 hover:text-primary-300 underline underline-offset-2 text-sm">
                    {children}
                  </a>
                ),
                // Blockquotes
                blockquote: ({children}) => (
                  <blockquote className="border-l-2 border-primary-500 pl-3 italic text-gray-400 my-2 text-sm">
                    {children}
                  </blockquote>
                ),
                // Strong/bold
                strong: ({children}) => <strong className="text-white font-semibold">{children}</strong>,
                // Paragraphs
                p: ({children}) => <p className="mb-2 leading-relaxed text-sm">{children}</p>,
              }}>
              {markdownContent}
            </ReactMarkdown>
          </div>
        )}
      </div>
    );
  }

  // Render regular content section
  return (
    <div className="animate-fade-in">
      <h2 className="text-lg font-bold font-display text-white mb-3 flex items-center gap-2">
        <span className="w-0.5 h-6 bg-gradient-to-b from-primary-500 to-accent rounded-full" />
        {section.title}
      </h2>

      <div className="prose max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            // Custom code block styling
            pre: ({children}) => (
              <pre className="bg-surface-0 border border-surface-3 rounded-lg p-3 overflow-x-auto my-3 text-sm">
                {children}
              </pre>
            ),
            code: ({className, children, ...props}) => {
              const isInline = !className;
              if (isInline) {
                return (
                  <code className="bg-surface-2 px-1 py-0.5 rounded text-primary-400 text-xs" {...props}>
                    {children}
                  </code>
                );
              }
              return (
                <code className="text-xs text-gray-300" {...props}>
                  {children}
                </code>
              );
            },
            // Custom table styling
            table: ({children}) => (
              <div className="overflow-x-auto my-3">
                <table className="w-full border-collapse text-sm">{children}</table>
              </div>
            ),
            th: ({children}) => (
              <th className="bg-surface-2 text-left p-2 font-semibold text-white border-b border-surface-4 text-xs">
                {children}
              </th>
            ),
            td: ({children}) => <td className="p-2 border-b border-surface-3 text-xs">{children}</td>,
            // Custom list styling
            ul: ({children}) => <ul className="my-2 ml-4 space-y-1">{children}</ul>,
            ol: ({children}) => <ol className="my-2 ml-4 space-y-1 list-decimal">{children}</ol>,
            li: ({children}) => <li className="text-gray-300 text-sm">{children}</li>,
            // Headings
            h1: ({children}) => <h1 className="text-xl font-bold font-display text-white mt-4 mb-2">{children}</h1>,
            h2: ({children}) => <h2 className="text-lg font-bold font-display text-white mt-4 mb-2">{children}</h2>,
            h3: ({children}) => (
              <h3 className="text-base font-semibold font-display text-white mt-3 mb-2">{children}</h3>
            ),
            // Links
            a: ({href, children}) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-400 hover:text-primary-300 underline underline-offset-2 text-sm">
                {children}
              </a>
            ),
            // Blockquotes
            blockquote: ({children}) => (
              <blockquote className="border-l-2 border-primary-500 pl-3 italic text-gray-400 my-2 text-sm">
                {children}
              </blockquote>
            ),
            // Strong/bold
            strong: ({children}) => <strong className="text-white font-semibold">{children}</strong>,
            // Paragraphs
            p: ({children}) => <p className="mb-2 leading-relaxed text-sm">{children}</p>,
          }}>
          {section.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
