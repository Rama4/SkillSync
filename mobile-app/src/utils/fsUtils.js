import RNFS from 'react-native-fs';

export const createNestedFolders = async path => {
  console.log('createNestedFolders()', 'path=', path);
  const parts = path.split('/'); // Split the path into individual directories
  let currentPath = '';

  for (const part of parts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    if (!currentPath?.length) {
      console.warn('createNestedFolders()', 'part of currentPath is empty');
      return;
    }
    try {
      const folderExists = await RNFS.exists(currentPath);
      if (folderExists) {
        console.log(`path already exists: ${currentPath}`);
      } else {
        await RNFS.mkdir(currentPath);
        console.log('createNestedFolders() created path:', currentPath);
      }
    } catch (error) {
      console.error(
        'createNestedFolders()',
        'currentPath=',
        currentPath,
        error,
      );
    }
  }
};

export const createNewFolder = async (path, folderName) => {
  const folderPath = `${path}/${folderName}`;
  try {
    const folderExists = await RNFS.exists(folderPath);
    if (folderExists) {
      console.log(`createNewFolder() path already exists: ${folderPath}`);
    } else {
      await RNFS.mkdir(folderPath);
      console.log(folderName, 'created');
    }
    return true;
  } catch (error) {
    console.error('createNewFolder()', folderName, error);
    return false;
  }
};

export const getFilesInFolder = async folderPath => {
  try {
    const result = await RNFS.readDir(folderPath);
    const fileNames = result
      .filter(item => item.isFile())
      .map(file => file.name);
    console.log('getFilesInFolder() File names in the folder:', fileNames);
    return fileNames;
  } catch (error) {
    console.error('getFilesInFolder()', error);
    return [];
  }
};

export const getFullPath = (fileDirectory, filename) =>
  fileDirectory + '/' + filename;

export const getFileName = filePath => {
  const parts = filePath.split(/[/\\]/);
  return parts[parts.length - 1];
};

export const getFileNameWithoutExtension = filePath => {
  const filename = getFileName(filePath);
  const parts = filename.split('.');
  return parts[0];
};

export const getFileExtension = filePath => {
  const filename = getFileName(filePath);
  const parts = filename.split('.');
  return parts[parts.length - 1];
};

export const copyFile = async (sourcePath, destinationPath) => {
  try {
    await RNFS.copyFile(sourcePath, destinationPath);
    console.log('copyFile() file copied successfully!');
    return true;
  } catch (error) {
    console.error('copyFile()', error);
    return false;
  }
};

export const deleteFile = async filePath => {
  try {
    await RNFS.deleteFile(filePath);
    console.log('file deleted successfully!');
    return true;
  } catch (error) {
    console.error('deleteFile()', error);
    return false;
  }
};

export const isFileExists = async (fileDirectory, fileName) => {
  try {
    const path = getFullPath(fileDirectory, fileName);
    console.log('isFileExists() path=', path);
    const stats = await RNFS.stat(path);
    return stats.isFile(); // Check if it's a file
  } catch (error) {
    // File may not exist if the error code is 'ENOENT' (Entity Not Found)
    console.error('isFileExists()', error);
    return false;
  }
};

export const fileExists = async filePath => {
  try {
    return await RNFS.exists(filePath);
  } catch (error) {
    console.error('fileExists()', error);
    return false;
  }
};

export const readJsonFile = async filePath => {
  try {
    const content = await RNFS.readFile(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('readJsonFile()', error);
    throw error;
  }
};

export const getFoldersInDirectory = async directoryPath => {
  try {
    const result = await RNFS.readDir(directoryPath);
    const folderNames = result
      .filter(item => item.isDirectory())
      .map(folder => folder.name);
    console.log('Folder names in the directory:', folderNames);
    return folderNames;
  } catch (error) {
    console.error('getFoldersInDirectory()', error);
    return [];
  }
};
