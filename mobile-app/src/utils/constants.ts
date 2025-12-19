import RNFS from 'react-native-fs';

export const API_BASE_URL = 'http://10.0.2.2:3000';

// Configuration for local file system on Android
// Primary: Download folder, Fallback: App's external directory
export const DOWNLOAD_DATA_PATH = `${RNFS.DownloadDirectoryPath}/SkillSync/data`;
export const EXTERNAL_DATA_PATH = `${RNFS.ExternalDirectoryPath}/SkillSync/data`;
export const TOPICS_FILE_NAME = 'topics.json';
