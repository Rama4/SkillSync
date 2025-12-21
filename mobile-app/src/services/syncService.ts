import {TopicMeta, Lesson} from '../../../lib/types';
import {TopicsIndex, TopicSummary} from '../../../lib/mobile_types';
import {databaseService} from '@/services/database';
import {getFullPath, isFileOrFolderExists, readJsonFile, getFoldersInDirectory} from '@/utils/fsUtils';
import {PermissionsAndroid, Platform} from 'react-native';
import {DOWNLOAD_DATA_PATH, EXTERNAL_DATA_PATH, TOPICS_FILE_NAME} from '@/utils/constants';

// Will be set dynamically based on accessibility
let PublicDataPath = DOWNLOAD_DATA_PATH;
let TopicsFilePath = `${PublicDataPath}/${TOPICS_FILE_NAME}`;

console.log('Download path:', DOWNLOAD_DATA_PATH);
console.log('External path:', EXTERNAL_DATA_PATH);

// Available topics - will be loaded dynamically from local files
let AVAILABLE_TOPICS: string[] = [];

export interface SyncStatus {
  isLoading: boolean;
  error: string | null;
  progress: {current: number; total: number};
}

class SyncService {
  private syncStatus: SyncStatus = {
    isLoading: false,
    error: null,
    progress: {current: 0, total: 0},
  };

  private listeners: ((status: SyncStatus) => void)[] = [];

  // Find an accessible data path (Download folder or app external directory)
  async findAccessibleDataPath(): Promise<string> {
    try {
      // First try to access Download folder
      const downloadFolderExists = await isFileOrFolderExists(DOWNLOAD_DATA_PATH);
      if (downloadFolderExists) {
        console.log('Using Download folder:', DOWNLOAD_DATA_PATH);
        PublicDataPath = DOWNLOAD_DATA_PATH;
        TopicsFilePath = `${PublicDataPath}/${TOPICS_FILE_NAME}`;
      } else {
        // try external directory
        const externalFolderExists = await isFileOrFolderExists(EXTERNAL_DATA_PATH);
        if (externalFolderExists) {
          console.log('Using external directory:', EXTERNAL_DATA_PATH);
          PublicDataPath = EXTERNAL_DATA_PATH;
          TopicsFilePath = `${PublicDataPath}/${TOPICS_FILE_NAME}`;
        } else {
          console.error('No accessible data path found in: ' + EXTERNAL_DATA_PATH + ' or ' + DOWNLOAD_DATA_PATH);
          throw new Error('No accessible data path found: ' + EXTERNAL_DATA_PATH + ' or ' + DOWNLOAD_DATA_PATH);
        }
      }
      return PublicDataPath;
    } catch (error) {
      console.error('Failed to find accessible data path:', error);
      throw new Error('Failed to find accessible data path: ' + error.message);
    }
  }

  // Create folder structure if it doesn't exist
  async ensureFolderExists(): Promise<void> {
    try {
      const accessiblePath = await this.findAccessibleDataPath();
      console.log('Ensured folder structure exists at:', accessiblePath);
    } catch (error) {
      console.error('Failed to create folder:', error);
      throw new Error(`Failed to create folder structure: ${error.message}`);
    }
  }

  // Request storage permissions for Android
  async requestStoragePermission(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true; // iOS doesn't need explicit permission for app documents
    }

    try {
      // For Android 11+ (API 30+), we need MANAGE_EXTERNAL_STORAGE
      // For older versions, READ_EXTERNAL_STORAGE is sufficient
      const permissions = [
        PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
      ];

      const granted = await PermissionsAndroid.requestMultiple(permissions);

      const readGranted =
        granted[PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED;
      const writeGranted =
        granted[PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE] === PermissionsAndroid.RESULTS.GRANTED;

      if (readGranted && writeGranted) {
        console.log('Storage permissions granted');
        return true;
      } else {
        console.log('Storage permissions denied:', granted);
        return false;
      }
    } catch (err) {
      console.warn('Permission request error:', err);
      return false;
    }
  }

  // Subscribe to sync status updates
  onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  private updateStatus(updates: Partial<SyncStatus>): void {
    this.syncStatus = {...this.syncStatus, ...updates};
    this.listeners.forEach(listener => listener(this.syncStatus));
  }

  // Store the topics index for sync status tracking
  private topicsIndex: TopicsIndex | null = null;

  async loadTopicsIndex(): Promise<TopicsIndex | null> {
    try {
      // Check if topics.json exists
      const topicsFileExists = await isFileOrFolderExists(TopicsFilePath);

      if (topicsFileExists) {
        console.log('Topics index file exists at:', TopicsFilePath);
        this.topicsIndex = await readJsonFile(TopicsFilePath);
        console.log('Loaded topics index:', this.topicsIndex);
        return this.topicsIndex;
      } else {
        console.log('Topics index file does not exist at:', TopicsFilePath);
        return null;
      }
    } catch (error) {
      console.error('Failed to load topics index:', error);
      return null;
    }
  }

  async loadAvailableTopics(): Promise<string[]> {
    try {
      // Try to load topics from topics.json first
      const topicsIndex = await this.loadTopicsIndex();

      if (topicsIndex && topicsIndex.topics && topicsIndex.topics.length > 0) {
        // Extract topic IDs from the TopicsIndex
        AVAILABLE_TOPICS = topicsIndex.topics.map(topic => topic.id);
        console.log('Loaded topics from topics.json:', AVAILABLE_TOPICS);
      } else {
        // Fallback: scan directories in data folder
        console.log('No topics in index, scanning directories...');
        AVAILABLE_TOPICS = await getFoldersInDirectory(PublicDataPath);
        console.log('Scanned topics from directories:', AVAILABLE_TOPICS);
      }
      return AVAILABLE_TOPICS;
    } catch (error) {
      console.error('Failed to load available topics:', error);
      // Fallback to hardcoded topics
      AVAILABLE_TOPICS = ['deep-learning'];
      return AVAILABLE_TOPICS;
    }
  }

  getTopicsIndex(): TopicsIndex | null {
    return this.topicsIndex;
  }

  getTopicSummary(topicId: string): TopicSummary | null {
    if (!this.topicsIndex) return null;
    return this.topicsIndex?.topics?.find(t => t.id === topicId) || null;
  }

  async fetchTopicData(topicId: string): Promise<TopicMeta> {
    const topicFilePath = getFullPath(getFullPath(PublicDataPath, topicId), 'topic.json');
    console.log('Reading topic from:', topicFilePath);

    try {
      const exists = await isFileOrFolderExists(topicFilePath);
      if (!exists) {
        throw new Error(`Topic file not found: ${topicFilePath}`);
      }

      return await readJsonFile(topicFilePath);
    } catch (error) {
      console.error(`Failed to read topic ${topicId}:`, error);
      throw new Error(`Failed to read topic ${topicId}: ${error.message}`);
    }
  }

  async fetchLessonData(topicId: string, lessonId: string): Promise<Lesson> {
    const lessonFilePath = getFullPath(
      getFullPath(getFullPath(PublicDataPath, topicId), 'lessons'),
      `${lessonId}.json`,
    );
    console.log('Reading lesson from:', lessonFilePath);

    try {
      const exists = await isFileOrFolderExists(lessonFilePath);
      if (!exists) {
        throw new Error(`Lesson file not found: ${lessonFilePath}`);
      }

      return await readJsonFile(lessonFilePath);
    } catch (error) {
      console.error(`Failed to read lesson ${lessonId}:`, error);
      throw new Error(`Failed to read lesson ${lessonId}: ${error.message}`);
    }
  }

  async syncAllData(): Promise<void> {
    this.updateStatus({
      isLoading: true,
      error: null,
      progress: {current: 0, total: 0},
    });

    try {
      // Request storage permission first
      const hasPermission = await this.requestStoragePermission();
      if (!hasPermission) {
        throw new Error('Storage permission is required to access files in Download folder');
      }

      // Ensure folder structure exists
      await this.ensureFolderExists();
      // First, load available topics from local files
      const availableTopics = await this.loadAvailableTopics();

      if (availableTopics.length === 0) {
        throw new Error('No topics found in Download/SkillSync/data/');
      }

      // Calculate total items to sync
      let totalItems = availableTopics.length; // Topics
      const topicsData: TopicMeta[] = [];

      // First, read all topics to count lessons
      for (const topicId of availableTopics) {
        try {
          const topicData = await this.fetchTopicData(topicId);
          topicsData.push(topicData);
          totalItems += topicData.lessons.length; // Add lessons count
        } catch (error) {
          console.error(`Failed to read topic ${topicId}:`, error);
          // Continue with other topics even if one fails
        }
      }

      this.updateStatus({
        progress: {current: 0, total: totalItems},
      });

      let currentItem = 0;

      // Save topics and read lessons
      for (const topicData of topicsData) {
        // Get version from topics index if available
        const topicSummary = this.getTopicSummary(topicData.id);
        const version = topicSummary?.version || '1.0.0';

        // Save topic with version and sync status
        await databaseService.saveTopic(topicData, version, 'synced');
        currentItem++;
        this.updateStatus({
          progress: {current: currentItem, total: totalItems},
        });

        // Read and save lessons
        for (const lessonMeta of topicData.lessons) {
          try {
            const lessonData = await this.fetchLessonData(topicData.id, lessonMeta.id);
            await databaseService.saveLesson(lessonData);
            currentItem++;
            this.updateStatus({
              progress: {current: currentItem, total: totalItems},
            });
          } catch (error) {
            console.error(`Failed to read lesson ${lessonMeta.id}:`, error);
            // Continue with other lessons even if one fails
          }
        }
      }

      // Update sync timestamp with topics index version
      const indexVersion = this.topicsIndex?.version || '1.0.0';
      await databaseService.updateSyncTimestamp(indexVersion);

      this.updateStatus({
        isLoading: false,
        error: null,
      });

      console.log('Local data sync completed successfully');
    } catch (error) {
      console.error('Local data sync failed:', error);
      this.updateStatus({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async checkForUpdates(): Promise<{
    hasUpdates: boolean;
    updatedTopics: TopicSummary[];
    newTopics: TopicSummary[];
    indexUpdated: boolean;
  }> {
    try {
      // Load the topics index from local files
      const topicsIndex = await this.loadTopicsIndex();

      if (!topicsIndex) {
        return {
          hasUpdates: false,
          updatedTopics: [],
          newTopics: [],
          indexUpdated: false,
        };
      }

      // Get current sync info from database
      const syncInfo = await databaseService.getSyncInfo();
      const currentIndexVersion = syncInfo.topicsIndexVersion;

      // Check if the index version has changed
      const indexUpdated = topicsIndex.version !== currentIndexVersion;

      const updatedTopics: TopicSummary[] = [];
      const newTopics: TopicSummary[] = [];

      // Check each topic in the index
      for (const topicSummary of topicsIndex.topics) {
        const localVersion = await databaseService.getTopicVersion(topicSummary.id);

        if (!localVersion) {
          // Topic doesn't exist locally - it's new
          newTopics.push(topicSummary);
        } else if (topicSummary.version !== localVersion) {
          // Version mismatch - topic has been updated
          updatedTopics.push(topicSummary);
          // Mark as outdated in database
          await databaseService.updateTopicSyncStatus(topicSummary.id, 'outdated');
        }
      }

      const hasUpdates = indexUpdated || updatedTopics.length > 0 || newTopics.length > 0;

      return {
        hasUpdates,
        updatedTopics,
        newTopics,
        indexUpdated,
      };
    } catch (error) {
      console.error('Failed to check for updates:', error);
      return {
        hasUpdates: false,
        updatedTopics: [],
        newTopics: [],
        indexUpdated: false,
      };
    }
  }

  getSyncStatus(): SyncStatus {
    return this.syncStatus;
  }

  async isDataAvailable(): Promise<boolean> {
    try {
      const topics = await databaseService.getAllTopics();
      return topics.length > 0;
    } catch (error) {
      console.error('Failed to check data availability:', error);
      return false;
    }
  }
}

export const syncService = new SyncService();
