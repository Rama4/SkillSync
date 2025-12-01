import fs from 'fs';
import path from 'path';
import { MediaFile, TopicMeta, LessonMeta, Lesson } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');

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
 * Get file type based on extension
 */
export function getFileType(filename: string): 'video' | 'markdown' | 'other' {
  const ext = path.extname(filename).toLowerCase();
  const videoExts = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv'];
  const markdownExts = ['.md', '.markdown'];
  
  if (videoExts.includes(ext)) return 'video';
  if (markdownExts.includes(ext)) return 'markdown';
  return 'other';
}

/**
 * Scan directory for media files
 */
export function scanMediaFiles(directory: string): MediaFile[] {
  const files: MediaFile[] = [];
  const fullPath = path.join(DATA_DIR, directory);
  
  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
    return files;
  }
  
  try {
    const entries = fs.readdirSync(fullPath, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = path.join(directory, entry.name);
        const stats = fs.statSync(path.join(fullPath, entry.name));
        
        files.push({
          path: filePath,
          name: entry.name,
          type: getFileType(entry.name),
          size: stats.size,
        });
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${directory}:`, error);
  }
  
  return files;
}

/**
 * Copy file from source to destination
 */
export function copyFile(sourcePath: string, destPath: string): void {
  const fullSourcePath = path.join(DATA_DIR, sourcePath);
  const fullDestPath = path.join(DATA_DIR, destPath);
  
  // Ensure destination directory exists
  const destDir = path.dirname(fullDestPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }
  
  fs.copyFileSync(fullSourcePath, fullDestPath);
}

/**
 * Generate lesson ID from filename
 */
export function generateLessonId(filename: string, index: number): string {
  const nameWithoutExt = path.parse(filename).name;
  return slugify(nameWithoutExt) || `lesson-${index + 1}`;
}

/**
 * Generate lesson title from filename
 */
export function generateLessonTitle(filename: string): string {
  const nameWithoutExt = path.parse(filename).name;
  // Clean up common patterns like [VIDEO_ID] or (video_id)
  return nameWithoutExt
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .trim()
    .replace(/\s+/g, ' ') || path.parse(filename).name;
}

/**
 * Estimate duration for a video file (placeholder - would need actual video metadata)
 */
export function estimateDuration(fileType: string, size?: number): string {
  if (fileType === 'video' && size) {
    // Rough estimate: ~1MB per minute for compressed video
    const estimatedMinutes = Math.max(1, Math.round(size / (1024 * 1024)));
    return `${estimatedMinutes} min`;
  }
  if (fileType === 'markdown') {
    return '5 min'; // Default for markdown
  }
  return '10 min'; // Default
}

/**
 * Generate lesson JSON from media file
 */
export function generateLessonFromMedia(
  mediaFile: MediaFile,
  topicId: string,
  order: number,
  previousLessonId: string | null,
  nextLessonId: string | null
): Lesson {
  const lessonId = generateLessonId(mediaFile.name, order - 1);
  const title = generateLessonTitle(mediaFile.name);
  const mediaPath = `media/${mediaFile.name}`;
  
  // Create appropriate section based on file type
  let section;
  if (mediaFile.type === 'video') {
    section = {
      id: `${lessonId}-video`,
      type: 'video' as const,
      title: title,
      content: '',
      videoUrl: `/api/media/${topicId}/${mediaPath}`,
      filePath: mediaPath,
      fileType: 'video' as const,
    };
  } else if (mediaFile.type === 'markdown') {
    // Read markdown content
    const markdownPath = path.join(DATA_DIR, mediaFile.path);
    let content = '';
    if (fs.existsSync(markdownPath)) {
      content = fs.readFileSync(markdownPath, 'utf-8');
    }
    
    section = {
      id: `${lessonId}-content`,
      type: 'markdown' as const,
      title: title,
      content: content,
      filePath: mediaPath,
      fileType: 'markdown' as const,
    };
  } else {
    section = {
      id: `${lessonId}-file`,
      type: 'file' as const,
      title: title,
      content: `File: ${mediaFile.name}`,
      filePath: mediaPath,
      fileType: 'other' as const,
    };
  }
  
  return {
    id: lessonId,
    title: title,
    topic: topicId,
    order: order,
    duration: estimateDuration(mediaFile.type, mediaFile.size),
    difficulty: 'beginner' as const,
    objectives: [`Learn from ${mediaFile.name}`],
    sections: [section],
    quiz: [],
    keyTakeaways: [],
    previousLesson: previousLessonId,
    nextLesson: nextLessonId,
    resources: [],
    lastUpdated: new Date().toISOString().split('T')[0],
  };
}

/**
 * Generate topic.json from registration data
 */
export function generateTopicJson(
  topicId: string,
  title: string,
  description: string,
  tags: string[],
  lessons: Lesson[]
): TopicMeta {
  const lessonMetas: LessonMeta[] = lessons.map(lesson => ({
    id: lesson.id,
    order: lesson.order,
    title: lesson.title,
    duration: lesson.duration,
    difficulty: lesson.difficulty,
  }));
  
  return {
    id: topicId,
    title,
    description,
    icon: '📚', // Default icon
    color: '#8B5CF6', // Default color
    lessons: lessonMetas,
    prerequisites: [],
    tags,
    lastUpdated: new Date().toISOString().split('T')[0],
  };
}

/**
 * Create topic directory structure
 */
export function createTopicDirectory(topicId: string): {
  topicDir: string;
  lessonsDir: string;
  mediaDir: string;
} {
  const topicDir = path.join(DATA_DIR, topicId);
  const lessonsDir = path.join(topicDir, 'lessons');
  const mediaDir = path.join(topicDir, 'media');
  
  // Create directories
  if (!fs.existsSync(topicDir)) {
    fs.mkdirSync(topicDir, { recursive: true });
  }
  if (!fs.existsSync(lessonsDir)) {
    fs.mkdirSync(lessonsDir, { recursive: true });
  }
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }
  
  return { topicDir, lessonsDir, mediaDir };
}

/**
 * Update the topics index file (data/topics.json)
 */
export function updateTopicsIndex(topicMeta: TopicMeta): void {
  const topicsIndexPath = path.join(DATA_DIR, 'topics.json');
  
  // Read existing topics index or create new one
  let topicsIndex: {
    version: string;
    lastUpdated: string;
    topics: Array<{
      id: string;
      title: string;
      description: string;
      icon: string;
      color: string;
      version: string;
      lastUpdated: string;
      lessonCount: number;
      totalDuration: string;
      difficulty: string;
      tags: string[];
    }>;
  };
  
  if (fs.existsSync(topicsIndexPath)) {
    try {
      topicsIndex = JSON.parse(fs.readFileSync(topicsIndexPath, 'utf-8'));
    } catch (error) {
      console.error('Error reading topics index:', error);
      // Create new index if file is corrupted
      topicsIndex = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString().split('T')[0],
        topics: []
      };
    }
  } else {
    // Create new topics index
    topicsIndex = {
      version: '1.0.0',
      lastUpdated: new Date().toISOString().split('T')[0],
      topics: []
    };
  }
  
  // Calculate total duration from lessons
  const totalMinutes = topicMeta.lessons.reduce((acc, lesson) => {
    const mins = parseInt(lesson.duration) || 0;
    return acc + mins;
  }, 0);
  
  // Determine predominant difficulty
  const difficulties = topicMeta.lessons.map(l => l.difficulty);
  const difficultyCount = difficulties.reduce((acc, diff) => {
    acc[diff] = (acc[diff] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const predominantDifficulty = Object.entries(difficultyCount)
    .sort(([,a], [,b]) => b - a)[0]?.[0] || 'beginner';
  
  // Create topic summary for index
  const topicSummary = {
    id: topicMeta.id,
    title: topicMeta.title,
    description: topicMeta.description,
    icon: '📚', // Default icon
    color: '#8B5CF6', // Default color
    version: '1.0.0',
    lastUpdated: topicMeta.lastUpdated,
    lessonCount: topicMeta.lessons.length,
    totalDuration: `${totalMinutes} min`,
    difficulty: predominantDifficulty,
    tags: topicMeta.tags
  };
  
  // Remove existing entry if it exists (update case)
  topicsIndex.topics = topicsIndex.topics.filter(t => t.id !== topicMeta.id);
  
  // Add new/updated topic
  topicsIndex.topics.push(topicSummary);
  
  // Update lastUpdated
  topicsIndex.lastUpdated = new Date().toISOString().split('T')[0];
  
  // Write back to file
  fs.writeFileSync(topicsIndexPath, JSON.stringify(topicsIndex, null, 2), 'utf-8');
}

