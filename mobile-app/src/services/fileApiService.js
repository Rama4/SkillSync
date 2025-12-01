import RNFS from 'react-native-fs';

export default function fileApiService() {
  const HOST_URL = `http://127.0.0.1:8000/myapp`;
  const CHUNK_SIZE = 1024 * 1024; // 1 MB

  const sampleApiCall = async () => {
    try {
      const url = 'https://www.google.com';
      const response = await fetch(url);
      const data = response.status;
      console.log(JSON.stringify(data, null, 4));
    } catch (e) {
      console.log('sampleApiCall:', JSON.stringify(e, null, 4));
    }
  };

  const uploadFile = async (url, filePath, cb) => {
    try {
      const file = await RNFS.readFile(filePath, 'base64');
      const totalSize = file.length;
      let uploaded = 0;

      while (uploaded < totalSize) {
        const start = uploaded;
        const end = Math.min(uploaded + CHUNK_SIZE, totalSize);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('file', {
          uri: `data:application/octet-stream;base64,${chunk}`,
          name: fileName,
          type: 'application/octet-stream',
        });

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'multipart/form-data',
            'Content-Range': `bytes ${start}-${end - 1}/${totalSize}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        // Note: fetch doesn't have built-in upload progress tracking like axios
        // You would need to implement this differently if progress tracking is needed
        const progress = (end / totalSize) * 100;
        console.log(`uploadFileInChunks(): Progress: ${progress.toFixed(2)}%`);

        uploaded += end - start;
      }

      cb(true);
    } catch (error) {
      console.error('Error uploading file:', error);
      cb(false);
    }
  };

  const uploadFiles = async (url, filePathList) => {
    try {
      const promises = filePathList.map(filePath => {
        return new Promise((resolve, reject) => {
          uploadFile(url, filePath, success => {
            if (success) {
              resolve();
            } else {
              reject();
            }
          });
        });
      });

      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Error uploading files:', error);
      return false;
    }
  };

  const downloadFile = async (url, filePath, cb) => {
    try {
      await RNFS.downloadFile({
        fromUrl: url,
        toFile: filePath,
        progress: res => {
          // Handle download progress updates if needed
          const progress = (res.bytesWritten / res.contentLength) * 100;
          console.log(`downloadFile(): Progress: ${progress.toFixed(2)}%`);
        },
      })
        .promise.then(r => {
          console.log('downloadFile() r=', r);
          cb(true);
        })
        .catch(e => {
          console.error('Error downloading file:', e);
          cb(false);
        });
    } catch (error) {
      console.error('Error downloading file:', error);
      cb(false);
    }
  };

  const downloadFiles = async (url, filePathList) => {
    try {
      const promises = filePathList.map(filePath => {
        return new Promise((resolve, reject) => {
          downloadFile(url, filePath, success => {
            if (success) {
              resolve();
            } else {
              reject();
            }
          });
        });
      });

      await Promise.all(promises);
      return true;
    } catch (error) {
      console.error('Error downloading files:', error);
      return false;
    }
  };

  return {
    uploadFile,
    uploadFiles,
    sampleApiCall,
    downloadFile,
    downloadFiles,
  };
}
