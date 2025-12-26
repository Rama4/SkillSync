import {TopicMeta} from '../../../lib/types';
import RNFS from 'react-native-fs';
import {DOWNLOAD_DATA_PATH, EXTERNAL_DATA_PATH} from '@/utils/constants';
import {createNestedFolders, isFileOrFolderExists, getFullPath} from '@/utils/fsUtils';

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

/**
 * Find the accessible data path (Download folder or external directory)
 */
async function findAccessibleDataPath(): Promise<string> {
  try {
    // First try to access Download folder
    const downloadFolderExists = await isFileOrFolderExists(DOWNLOAD_DATA_PATH);
    if (downloadFolderExists) {
      return DOWNLOAD_DATA_PATH;
    } else {
      // Try external directory
      const externalFolderExists = await isFileOrFolderExists(EXTERNAL_DATA_PATH);
      if (externalFolderExists) {
        return EXTERNAL_DATA_PATH;
      } else {
        // If neither exists, try to create Download folder
        await createNestedFolders(DOWNLOAD_DATA_PATH);
        return DOWNLOAD_DATA_PATH;
      }
    }
  } catch (error) {
    console.error('Failed to find accessible data path:', error);
    // Fallback to Download path
    return DOWNLOAD_DATA_PATH;
  }
}

/**
 * Update the topics.json index file to include a new or updated topic
 */
async function updateTopicsIndex(topic: TopicMeta, dataPath: string): Promise<void> {
  try {
    const topicsJsonPath = getFullPath(dataPath, 'topics.json');
    
    // Read existing topics.json or create new one
    let topicsIndex: any;
    const topicsJsonExists = await isFileOrFolderExists(topicsJsonPath);
    
    if (topicsJsonExists) {
      const content = await RNFS.readFile(topicsJsonPath, 'utf8');
      topicsIndex = JSON.parse(content);
    } else {
      topicsIndex = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString().split('T')[0],
        topics: [],
      };
    }
    
    // Calculate total duration and difficulty
    const totalMinutes = topic.lessons.reduce((sum, lesson) => {
      const duration = lesson.duration || '0 min';
      const minutes = parseInt(duration.split(' ')[0]) || 0;
      return sum + minutes;
    }, 0);
    
    const difficulties = topic.lessons.map(l => l.difficulty);
    const difficultyCount = difficulties.reduce((acc, diff) => {
      acc[diff] = (acc[diff] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const predominantDifficulty = Object.entries(difficultyCount)
      .sort(([, a], [, b]) => b - a)[0]?.[0] || 'beginner';
    
    // Create topic summary
    const topicSummary = {
      id: topic.id,
      title: topic.title,
      description: topic.description,
      icon: topic.icon || '📚',
      color: topic.color || '#8B5CF6',
      version: '1.0.0',
      lastUpdated: topic.lastUpdated,
      lessonCount: topic.lessons.length,
      totalDuration: `${totalMinutes} min`,
      difficulty: predominantDifficulty,
      tags: topic.tags,
    };
    
    // Remove existing entry if it exists (update case)
    topicsIndex.topics = topicsIndex.topics.filter((t: any) => t.id !== topic.id);
    
    // Add new/updated topic
    topicsIndex.topics.push(topicSummary);
    
    // Update lastUpdated
    topicsIndex.lastUpdated = new Date().toISOString().split('T')[0];
    
    // Write back to file
    await RNFS.writeFile(topicsJsonPath, JSON.stringify(topicsIndex, null, 2), 'utf8');
    console.log('Updated topics.json index');
  } catch (error) {
    console.error('Failed to update topics.json:', error);
    // Don't throw - allow topic creation to continue
  }
}

/**
 * Create folder structure and topic.json file for a manually created topic
 * This ensures the topic persists across app reloads by being discoverable during sync
 */
export async function createTopicFolderStructure(topic: TopicMeta): Promise<void> {
  try {
    // Find accessible data path
    const dataPath = await findAccessibleDataPath();
    
    // Create topic directory: {dataPath}/{topicId}/
    const topicDir = getFullPath(dataPath, topic.id);
    await createNestedFolders(topicDir);
    
    // Create lessons directory: {dataPath}/{topicId}/lessons/
    const lessonsDir = getFullPath(topicDir, 'lessons');
    await createNestedFolders(lessonsDir);
    
    // Create topic.json file
    const topicJsonPath = getFullPath(topicDir, 'topic.json');
    const topicJsonContent = JSON.stringify(topic, null, 2);
    
    await RNFS.writeFile(topicJsonPath, topicJsonContent, 'utf8');
    console.log('Created topic folder structure at:', topicDir);
    
    // Update topics.json index to include this topic
    await updateTopicsIndex(topic, dataPath);
  } catch (error) {
    console.error('Failed to create topic folder structure:', error);
    // Don't throw - allow topic creation to continue even if folder creation fails
    // The topic will still be saved in the database
  }
}
