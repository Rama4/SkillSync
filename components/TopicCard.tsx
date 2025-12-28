"use client";

import Link from "next/link";
import { BookOpen, ChevronRight } from "lucide-react";
import { TopicMeta } from "@/lib/types";
import { useProgressStore } from "@/lib/store";

interface TopicCardProps {
  topic: TopicMeta;
}

export default function TopicCard({ topic }: TopicCardProps) {
  const { getTopicProgress } = useProgressStore();
  const progress = getTopicProgress(topic.id, topic.lessons.length);

  return (
    <Link href={`/topic/${topic.id}`}>
      <div className="card card-hover p-3 h-full flex flex-col group">
        {/* Header */}
        <div className="flex items-center justify-center mb-2">
          <div
            className="text-3xl p-2 rounded-lg"
            style={{ backgroundColor: `${topic.color}15` }}
          >
            {topic.icon}
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="text-sm font-semibold font-display text-white mb-1 text-center group-hover:text-primary-400 transition-colors line-clamp-1">
          {topic.title}
        </h3>
        <p className="text-gray-400 text-xs leading-snug flex-grow mb-2 text-center line-clamp-2">
          {topic.description}
        </p>

        {/* Stats */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mb-2">
          <div className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            <span>{topic.lessons.length}</span>
          </div>
        </div>

        {/* Progress bar */}
        {progress > 0 && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-400 text-[10px]">Progress</span>
              <span className="text-primary-400 font-medium text-[10px]">
                {Math.round(progress)}%
              </span>
            </div>
            <div className="h-1 bg-surface-3 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* CTA */}
        <div className="flex items-center justify-center text-primary-400 text-xs font-medium group-hover:translate-x-1 transition-transform">
          {progress > 0 ? "Continue" : "Start"}
          <ChevronRight className="w-3 h-3 ml-0.5" />
        </div>
      </div>
    </Link>
  );
}
