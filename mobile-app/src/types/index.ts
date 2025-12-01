// Topic metadata stored in topic.json
export interface TopicMeta {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  lessons: LessonMeta[];
  prerequisites: string[];
  tags: string[];
  lastUpdated: string;
}

// Basic lesson metadata (used in topic.json)
export interface LessonMeta {
  id: string;
  order: number;
  title: string;
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

// Full lesson content (stored in lessons/*.json)
export interface Lesson {
  id: string;
  title: string;
  topic: string;
  order: number;
  duration: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  objectives: string[];
  sections: LessonSection[];
  quiz: QuizQuestion[];
  keyTakeaways: string[];
  previousLesson: string | null;
  nextLesson: string | null;
  resources: Resource[];
  lastUpdated: string;
}

export interface LessonSection {
  id: string;
  type: 'content' | 'code' | 'exercise' | 'video';
  title: string;
  content: string;
  codeLanguage?: string;
  videoUrl?: string;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'fill-blank';
  question: string;
  options?: string[];
  correctAnswer: number | string | boolean;
  explanation: string;
}

export interface Resource {
  title: string;
  url: string;
  type: 'video' | 'article' | 'book' | 'course' | 'paper' | 'interactive';
}

// Progress tracking
export interface UserProgress {
  topicId: string;
  lessonsCompleted: string[];
  currentLesson: string | null;
  quizScores: Record<string, number>;
  lastAccessed: string;
}

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
