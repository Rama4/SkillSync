// Topic metadata stored in topic.json
export interface TopicMeta {
  id: string;
  title: string;
  description: string;
  lessons: LessonMeta[];
  tags: string[];
  lastUpdated: string;
}

// Basic lesson metadata (used in topic.json)
export interface LessonMeta {
  id: string;
  order: number;
  title: string;
}

// Full lesson content (stored in lessons/*.json)
export interface Lesson {
  id: string;
  title: string;
  topic: string;
  order: number;
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
  type: 'content' | 'code' | 'exercise' | 'video' | 'markdown' | 'file' | 'image';
  title: string;
  content: string;
  codeLanguage?: string;
  videoUrl?: string;
  filePath?: string; // Path to media file relative to topic folder
  fileType?: 'video' | 'markdown' | 'image' | 'text' | 'other'; // Type of file for rendering
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

// Media file reference for topic registration
export interface MediaFile {
  path: string; // Source path relative to data directory
  name: string; // Display name
  type: 'video' | 'markdown' | 'image' | 'text' | 'other';
  size?: number;
}

// Topic registration request
export interface TopicRegistrationRequest {
  title: string;
  description: string;
  tags: string[];
  mediaFiles: MediaFile[]; // Ordered list of media files
}

// Note for lessons
export interface Note {
  id: string;
  lessonId: string;
  sectionId?: string; // Optional section ID for notes mapped to specific sections
  title: string;
  markdown: string;
  audioFile?: string; // Path relative to notes folder, e.g., "audio/note-1.mp3"
  createdAt: string;
  updatedAt: string;
}

// Notes index file structure
export interface NotesIndex {
  notes: string[]; // Array of note IDs
  lastUpdated: string;
}
