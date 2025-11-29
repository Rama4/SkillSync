import { TopicMeta, Lesson } from './types';
import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'data');

// Get all available topics
export async function getTopics(): Promise<TopicMeta[]> {
  const topics: TopicMeta[] = [];
  
  try {
    const topicDirs = fs.readdirSync(DATA_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    for (const dir of topicDirs) {
      const topicPath = path.join(DATA_DIR, dir, 'topic.json');
      if (fs.existsSync(topicPath)) {
        const topicData = JSON.parse(fs.readFileSync(topicPath, 'utf-8'));
        topics.push(topicData);
      }
    }
  } catch (error) {
    console.error('Error reading topics:', error);
  }
  
  return topics;
}

// Get a specific topic by ID
export async function getTopic(topicId: string): Promise<TopicMeta | null> {
  try {
    const topicPath = path.join(DATA_DIR, topicId, 'topic.json');
    if (fs.existsSync(topicPath)) {
      return JSON.parse(fs.readFileSync(topicPath, 'utf-8'));
    }
  } catch (error) {
    console.error(`Error reading topic ${topicId}:`, error);
  }
  return null;
}

// Get a specific lesson
export async function getLesson(topicId: string, lessonId: string): Promise<Lesson | null> {
  try {
    const lessonPath = path.join(DATA_DIR, topicId, 'lessons', `${lessonId}.json`);
    if (fs.existsSync(lessonPath)) {
      return JSON.parse(fs.readFileSync(lessonPath, 'utf-8'));
    }
  } catch (error) {
    console.error(`Error reading lesson ${lessonId}:`, error);
  }
  return null;
}

// Get all lessons for a topic
export async function getLessons(topicId: string): Promise<Lesson[]> {
  const lessons: Lesson[] = [];
  
  try {
    const lessonsDir = path.join(DATA_DIR, topicId, 'lessons');
    if (fs.existsSync(lessonsDir)) {
      const lessonFiles = fs.readdirSync(lessonsDir)
        .filter(file => file.endsWith('.json'));
      
      for (const file of lessonFiles) {
        const lessonPath = path.join(lessonsDir, file);
        const lessonData = JSON.parse(fs.readFileSync(lessonPath, 'utf-8'));
        lessons.push(lessonData);
      }
      
      // Sort by order
      lessons.sort((a, b) => a.order - b.order);
    }
  } catch (error) {
    console.error(`Error reading lessons for ${topicId}:`, error);
  }
  
  return lessons;
}

