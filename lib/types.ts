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

