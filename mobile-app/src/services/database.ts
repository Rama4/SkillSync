import SQLite from 'react-native-sqlite-storage';
import {TopicMeta, Lesson} from '../../../lib/types';

// Enable debugging
SQLite.DEBUG(true);
SQLite.enablePromise(true);

const DATABASE_NAME = 'SkillSync.db';
const DATABASE_VERSION = '1.0';
const DATABASE_DISPLAYNAME = 'SkillSync Database';
const DATABASE_SIZE = 200000;

class DatabaseService {
  private db: SQLite.SQLiteDatabase | null = null;

  async initDatabase(): Promise<void> {
    try {
      this.db = await SQLite.openDatabase({
        name: DATABASE_NAME,
        version: DATABASE_VERSION,
        displayName: DATABASE_DISPLAYNAME,
        size: DATABASE_SIZE,
      });

      await this.createTables();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Database initialization failed:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Drop existing tables to ensure clean schema (development mode)
    await this.db.executeSql('DROP TABLE IF EXISTS lessons;');
    await this.db.executeSql('DROP TABLE IF EXISTS topics;');
    await this.db.executeSql('DROP TABLE IF EXISTS sync_meta;');

    // Create tables with current schema
    const createTopicsTable = `
      CREATE TABLE topics (
        id TEXT PRIMARY KEY,
        data TEXT NOT NULL,
        version TEXT NOT NULL,
        lastUpdated TEXT NOT NULL,
        syncStatus TEXT DEFAULT 'synced'
      );
    `;

    const createLessonsTable = `
      CREATE TABLE lessons (
        id TEXT PRIMARY KEY,
        topicId TEXT NOT NULL,
        data TEXT NOT NULL,
        version TEXT NOT NULL,
        lastUpdated TEXT NOT NULL,
        FOREIGN KEY (topicId) REFERENCES topics (id)
      );
    `;

    const createSyncMetaTable = `
      CREATE TABLE sync_meta (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        lastSyncTimestamp TEXT NOT NULL,
        topicsIndexVersion TEXT DEFAULT '0.0.0'
      );
    `;

    await this.db.executeSql(createTopicsTable);
    await this.db.executeSql(createLessonsTable);
    await this.db.executeSql(createSyncMetaTable);

    console.log('Database tables recreated with current schema');
  }

  // Topic operations
  async saveTopic(
    topic: TopicMeta,
    version: string = '1.0.0',
    syncStatus: 'synced' | 'pending' | 'outdated' = 'synced',
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const insertQuery = `
      INSERT OR REPLACE INTO topics (id, data, version, lastUpdated, syncStatus)
      VALUES (?, ?, ?, ?, ?);
    `;

    await this.db.executeSql(insertQuery, [
      topic.id,
      JSON.stringify(topic),
      version,
      topic.lastUpdated,
      syncStatus,
    ]);
  }

  async updateTopicSyncStatus(
    topicId: string,
    syncStatus: 'synced' | 'pending' | 'outdated',
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const updateQuery = `UPDATE topics SET syncStatus = ? WHERE id = ?;`;
    await this.db.executeSql(updateQuery, [syncStatus, topicId]);
  }

  async getTopicSyncStatus(topicId: string): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');

    const selectQuery = 'SELECT syncStatus FROM topics WHERE id = ?;';
    const [results] = await this.db.executeSql(selectQuery, [topicId]);

    if (results.rows.length === 0) return null;
    return results.rows.item(0).syncStatus;
  }

  async getTopicVersion(topicId: string): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');

    const selectQuery = 'SELECT version FROM topics WHERE id = ?;';
    const [results] = await this.db.executeSql(selectQuery, [topicId]);

    if (results.rows.length === 0) return null;
    return results.rows.item(0).version;
  }

  async getAllTopics(): Promise<TopicMeta[]> {
    if (!this.db) throw new Error('Database not initialized');

    const selectQuery = 'SELECT * FROM topics ORDER BY id;';
    const [results] = await this.db.executeSql(selectQuery);

    const topics: TopicMeta[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      topics.push(JSON.parse(row.data));
    }

    return topics;
  }

  async getTopic(topicId: string): Promise<TopicMeta | null> {
    if (!this.db) throw new Error('Database not initialized');

    const selectQuery = 'SELECT * FROM topics WHERE id = ?;';
    const [results] = await this.db.executeSql(selectQuery, [topicId]);

    if (results.rows.length === 0) return null;

    const row = results.rows.item(0);
    return JSON.parse(row.data);
  }

  // Lesson operations
  async saveLesson(lesson: Lesson): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const insertQuery = `
      INSERT OR REPLACE INTO lessons (id, topicId, data, version, lastUpdated)
      VALUES (?, ?, ?, ?, ?);
    `;

    await this.db.executeSql(insertQuery, [
      lesson.id,
      lesson.topic,
      JSON.stringify(lesson),
      lesson.lastUpdated,
      lesson.lastUpdated,
    ]);
  }

  async getLesson(lessonId: string): Promise<Lesson | null> {
    if (!this.db) throw new Error('Database not initialized');

    const selectQuery = 'SELECT * FROM lessons WHERE id = ?;';
    const [results] = await this.db.executeSql(selectQuery, [lessonId]);

    if (results.rows.length === 0) return null;

    const row = results.rows.item(0);
    return JSON.parse(row.data);
  }

  async getLessonsByTopic(topicId: string): Promise<Lesson[]> {
    if (!this.db) throw new Error('Database not initialized');

    const selectQuery = 'SELECT * FROM lessons WHERE topicId = ? ORDER BY id;';
    const [results] = await this.db.executeSql(selectQuery, [topicId]);

    const lessons: Lesson[] = [];
    for (let i = 0; i < results.rows.length; i++) {
      const row = results.rows.item(i);
      lessons.push(JSON.parse(row.data));
    }

    return lessons;
  }

  // Sync metadata operations
  async updateSyncTimestamp(
    topicsIndexVersion: string = '1.0.0',
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const timestamp = new Date().toISOString();
    const insertQuery = `
      INSERT OR REPLACE INTO sync_meta (id, lastSyncTimestamp, topicsIndexVersion)
      VALUES (1, ?, ?);
    `;

    await this.db.executeSql(insertQuery, [timestamp, topicsIndexVersion]);
  }

  async getLastSyncTimestamp(): Promise<string | null> {
    if (!this.db) throw new Error('Database not initialized');

    const selectQuery = 'SELECT lastSyncTimestamp FROM sync_meta WHERE id = 1;';
    const [results] = await this.db.executeSql(selectQuery);

    if (results.rows.length === 0) return null;

    return results.rows.item(0).lastSyncTimestamp;
  }

  async getTopicsIndexVersion(): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const selectQuery =
      'SELECT topicsIndexVersion FROM sync_meta WHERE id = 1;';
    const [results] = await this.db.executeSql(selectQuery);

    if (results.rows.length === 0) return '0.0.0';

    return results.rows.item(0).topicsIndexVersion || '0.0.0';
  }

  async getSyncInfo(): Promise<{
    lastSyncTimestamp: string | null;
    topicsIndexVersion: string;
    topicsSynced: number;
    topicsOutdated: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const syncMetaQuery = 'SELECT * FROM sync_meta WHERE id = 1;';
    const [syncResults] = await this.db.executeSql(syncMetaQuery);

    const topicsCountQuery =
      'SELECT syncStatus, COUNT(*) as count FROM topics GROUP BY syncStatus;';
    const [topicsResults] = await this.db.executeSql(topicsCountQuery);

    let topicsSynced = 0;
    let topicsOutdated = 0;

    for (let i = 0; i < topicsResults.rows.length; i++) {
      const row = topicsResults.rows.item(i);
      if (row.syncStatus === 'synced') {
        topicsSynced = row.count;
      } else if (row.syncStatus === 'outdated') {
        topicsOutdated = row.count;
      }
    }

    return {
      lastSyncTimestamp:
        syncResults.rows.length > 0
          ? syncResults.rows.item(0).lastSyncTimestamp
          : null,
      topicsIndexVersion:
        syncResults.rows.length > 0
          ? syncResults.rows.item(0).topicsIndexVersion || '0.0.0'
          : '0.0.0',
      topicsSynced,
      topicsOutdated,
    };
  }

  // Utility methods
  async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    await this.db.executeSql('DELETE FROM lessons;');
    await this.db.executeSql('DELETE FROM topics;');
    await this.db.executeSql('DELETE FROM sync_meta;');
  }

  async closeDatabase(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();
