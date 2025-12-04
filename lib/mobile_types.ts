// Topic metadata stored in topic.json

// Main topics.json structure (contains sync status and topic list)
export interface TopicsIndex {
  version: string;
  lastUpdated: string;
  topics: TopicSummary[];
}

// Topic summary in topics.json (lightweight metadata for listing)
export interface TopicSummary {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  version: string;
  lastUpdated: string;
  lessonCount: number;
  totalDuration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'mixed';
  tags: string[];
}

// Database types for SQLite storage
export interface DbTopic {
  id: string;
  data: string; // JSON stringified TopicMeta
  version: string;
  lastUpdated: string;
  syncStatus: 'synced' | 'pending' | 'outdated';
}

export interface DbLesson {
  id: string;
  topicId: string;
  data: string; // JSON stringified Lesson
  version: string;
  lastUpdated: string;
}

export interface DbSyncMeta {
  id: number;
  lastSyncTimestamp: string;
  topicsIndexVersion: string;
}

// Navigation types
export type RootStackParamList = {
  Home: undefined;
  Topic: {topicId: string; topicTitle: string};
  Lesson: {lessonId: string; topicId: string; lessonTitle: string};
  Settings: undefined;
};
