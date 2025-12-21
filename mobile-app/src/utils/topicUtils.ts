import {TopicMeta} from '../../../lib/types';

/**
 * Generate a URL-friendly slug from a string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Create an empty topic with just a title
 */
export function createEmptyTopic(title: string): TopicMeta {
  const topicId = slugify(title) || `topic-${Date.now()}`;
  const now = new Date().toISOString().split('T')[0];

  return {
    id: topicId,
    title,
    description: '',
    icon: '📚',
    color: '#8B5CF6',
    lessons: [],
    prerequisites: [],
    tags: [],
    lastUpdated: now,
  };
}
