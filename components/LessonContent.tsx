'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { LessonSection } from '@/lib/types';

interface LessonContentProps {
  section: LessonSection;
}

export default function LessonContent({ section }: LessonContentProps) {
  return (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-bold font-display text-white mb-6 flex items-center gap-3">
        <span className="w-1 h-8 bg-gradient-to-b from-primary-500 to-accent rounded-full" />
        {section.title}
      </h2>
      
      <div className="prose max-w-none">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            // Custom code block styling
            pre: ({ children }) => (
              <pre className="bg-surface-0 border border-surface-3 rounded-xl p-4 overflow-x-auto my-4">
                {children}
              </pre>
            ),
            code: ({ className, children, ...props }) => {
              const isInline = !className;
              if (isInline) {
                return (
                  <code className="bg-surface-2 px-1.5 py-0.5 rounded text-primary-400 text-sm" {...props}>
                    {children}
                  </code>
                );
              }
              return (
                <code className="text-sm text-gray-300" {...props}>
                  {children}
                </code>
              );
            },
            // Custom table styling
            table: ({ children }) => (
              <div className="overflow-x-auto my-6">
                <table className="w-full border-collapse">{children}</table>
              </div>
            ),
            th: ({ children }) => (
              <th className="bg-surface-2 text-left p-3 font-semibold text-white border-b border-surface-4">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="p-3 border-b border-surface-3">{children}</td>
            ),
            // Custom list styling
            ul: ({ children }) => (
              <ul className="my-4 ml-6 space-y-2">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="my-4 ml-6 space-y-2 list-decimal">{children}</ol>
            ),
            li: ({ children }) => (
              <li className="text-gray-300">{children}</li>
            ),
            // Headings
            h1: ({ children }) => (
              <h1 className="text-3xl font-bold font-display text-white mt-8 mb-4">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-2xl font-bold font-display text-white mt-8 mb-4">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-xl font-semibold font-display text-white mt-6 mb-3">{children}</h3>
            ),
            // Links
            a: ({ href, children }) => (
              <a 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary-400 hover:text-primary-300 underline underline-offset-2"
              >
                {children}
              </a>
            ),
            // Blockquotes
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-primary-500 pl-4 italic text-gray-400 my-4">
                {children}
              </blockquote>
            ),
            // Strong/bold
            strong: ({ children }) => (
              <strong className="text-white font-semibold">{children}</strong>
            ),
            // Paragraphs
            p: ({ children }) => (
              <p className="mb-4 leading-relaxed">{children}</p>
            ),
          }}
        >
          {section.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}

