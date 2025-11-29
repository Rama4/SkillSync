'use client';

import Link from 'next/link';
import { Clock, BookOpen, ChevronRight } from 'lucide-react';
import { TopicMeta } from '@/lib/types';
import { useProgressStore } from '@/lib/store';

interface TopicCardProps {
  topic: TopicMeta;
}

export default function TopicCard({ topic }: TopicCardProps) {
  const { getTopicProgress } = useProgressStore();
  const progress = getTopicProgress(topic.id, topic.lessons.length);
  
  const totalDuration = topic.lessons.reduce((acc, lesson) => {
    const mins = parseInt(lesson.duration) || 0;
    return acc + mins;
  }, 0);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-400 bg-green-400/10';
      case 'intermediate': return 'text-yellow-400 bg-yellow-400/10';
      case 'advanced': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  // Get the predominant difficulty
  const difficulties = topic.lessons.map(l => l.difficulty);
  const predominantDifficulty = difficulties.sort((a, b) =>
    difficulties.filter(v => v === a).length - difficulties.filter(v => v === b).length
  ).pop() || 'beginner';

  return (
    <Link href={`/topic/${topic.id}`}>
      <div className="card card-hover p-6 h-full flex flex-col group">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div 
            className="text-4xl p-3 rounded-xl"
            style={{ backgroundColor: `${topic.color}15` }}
          >
            {topic.icon}
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getDifficultyColor(predominantDifficulty)}`}>
            {predominantDifficulty}
          </span>
        </div>

        {/* Title & Description */}
        <h3 className="text-xl font-semibold font-display text-white mb-2 group-hover:text-primary-400 transition-colors">
          {topic.title}
        </h3>
        <p className="text-gray-400 text-sm leading-relaxed flex-grow mb-4">
          {topic.description}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
          <div className="flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" />
            <span>{topic.lessons.length} lessons</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            <span>{totalDuration} min</span>
          </div>
        </div>

        {/* Progress bar */}
        {progress > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-gray-400">Progress</span>
              <span className="text-primary-400 font-medium">{Math.round(progress)}%</span>
            </div>
            <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {topic.tags.slice(0, 3).map((tag) => (
            <span 
              key={tag}
              className="px-2 py-1 text-xs bg-surface-3 text-gray-400 rounded-md"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center text-primary-400 text-sm font-medium group-hover:translate-x-1 transition-transform">
          {progress > 0 ? 'Continue Learning' : 'Start Learning'}
          <ChevronRight className="w-4 h-4 ml-1" />
        </div>
      </div>
    </Link>
  );
}

