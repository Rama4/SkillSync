"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { LessonSection } from "@/lib/types";
import { useState, useEffect } from "react";

interface LessonContentProps {
  section: LessonSection;
}

export default function LessonContent({ section }: LessonContentProps) {
  const [markdownContent, setMarkdownContent] = useState<string>("");
  const [loadingMarkdown, setLoadingMarkdown] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string>("");

  // Load markdown content from file if needed
  useEffect(() => {
    if (typeof window === "undefined") {
      setMarkdownContent(section.content || "");
      return;
    }

    if (
      section.type === "video" ||
      (section.fileType === "video" && section.filePath)
    ) {
      // Extract topic ID from URL if videoUrl is not set
      let _videoUrl = section.videoUrl;
      if (!_videoUrl && section.filePath && typeof window !== "undefined") {
        const topicMatch = window.location.pathname.match(/\/topic\/([^/]+)/);
        if (topicMatch) {
          _videoUrl = `/api/media/${topicMatch[1]}/${section.filePath}`;
        }
      }
      console.log("video url:", _videoUrl);
      setVideoUrl(_videoUrl || "");
    }
    if (
      (section.type === "markdown" || section.fileType === "markdown") &&
      section.filePath &&
      !section.content
    ) {
      setLoadingMarkdown(true);
      // Extract topic ID from URL
      const topicMatch = window.location.pathname.match(/\/topic\/([^/]+)/);
      if (topicMatch) {
        const topicId = topicMatch[1];
        const mediaUrl = `/api/media/${topicId}/${section.filePath}`;

        fetch(mediaUrl)
          .then((res) => res.text())
          .then((text) => {
            setMarkdownContent(text);
            setLoadingMarkdown(false);
          })
          .catch((err) => {
            console.error("Error loading markdown:", err);
            setMarkdownContent(section.content || "");
            setLoadingMarkdown(false);
          });
      } else {
        setMarkdownContent(section.content || "");
        setLoadingMarkdown(false);
      }
    } else {
      setMarkdownContent(section.content || "");
    }
  }, [section]);

  // Render video section
  if (
    section.type === "video" ||
    (section.fileType === "video" && section.filePath)
  ) {
    return (
      <div className="animate-fade-in">
        <h2 className="text-2xl font-bold font-display text-white mb-6 flex items-center gap-3">
          <span className="w-1 h-8 bg-gradient-to-b from-primary-500 to-accent rounded-full" />
          {section.title}
        </h2>

        {videoUrl && (
          <div className="my-6">
            <video
              controls
              className="w-full rounded-xl bg-surface-0 border border-surface-3"
              style={{ maxHeight: "600px" }}
            >
              <source src={videoUrl} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </div>
        )}

        {section.content && (
          <div className="prose max-w-none mt-6">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {section.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    );
  }

  // Render markdown file section
  if (section.type === "markdown" || section.fileType === "markdown") {
    return (
      <div className="animate-fade-in">
        <h2 className="text-2xl font-bold font-display text-white mb-6 flex items-center gap-3">
          <span className="w-1 h-8 bg-gradient-to-b from-primary-500 to-accent rounded-full" />
          {section.title}
        </h2>

        {loadingMarkdown ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-gray-400">Loading content...</div>
          </div>
        ) : (
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
                      <code
                        className="bg-surface-2 px-1.5 py-0.5 rounded text-primary-400 text-sm"
                        {...props}
                      >
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
                  <ol className="my-4 ml-6 space-y-2 list-decimal">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="text-gray-300">{children}</li>
                ),
                // Headings
                h1: ({ children }) => (
                  <h1 className="text-3xl font-bold font-display text-white mt-8 mb-4">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-2xl font-bold font-display text-white mt-8 mb-4">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl font-semibold font-display text-white mt-6 mb-3">
                    {children}
                  </h3>
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
                  <strong className="text-white font-semibold">
                    {children}
                  </strong>
                ),
                // Paragraphs
                p: ({ children }) => (
                  <p className="mb-4 leading-relaxed">{children}</p>
                ),
              }}
            >
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
                  <code
                    className="bg-surface-2 px-1.5 py-0.5 rounded text-primary-400 text-sm"
                    {...props}
                  >
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
            li: ({ children }) => <li className="text-gray-300">{children}</li>,
            // Headings
            h1: ({ children }) => (
              <h1 className="text-3xl font-bold font-display text-white mt-8 mb-4">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-2xl font-bold font-display text-white mt-8 mb-4">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-xl font-semibold font-display text-white mt-6 mb-3">
                {children}
              </h3>
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
