import { google } from 'googleapis';
import { Readable } from 'stream';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  parents?: string[];
}

class DriveService {
  private drive;
  private auth;
  private static instance: DriveService;

  private constructor() {
    const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const key = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    // OAuth credentials
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (clientId && clientSecret && refreshToken) {
      console.log('Using OAuth 2.0 Credentials');
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
      oauth2Client.setCredentials({ refresh_token: refreshToken });
      this.auth = oauth2Client;
    } else if (email && key) {
      console.log('Using Service Account Credentials');
      this.auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: email,
          private_key: key,
        },
        scopes: ['https://www.googleapis.com/auth/drive'],
      });
    } else {
      console.warn('No valid Google Drive credentials found in environment variables.');
    }

    this.drive = google.drive({ version: 'v3', auth: this.auth });
  }

  public static getInstance(): DriveService {
    if (!DriveService.instance) {
      DriveService.instance = new DriveService();
    }
    return DriveService.instance;
  }

  async listChildren(folderId: string): Promise<DriveFile[]> {
    try {
      const res = await this.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, parents)',
        orderBy: 'name',
        pageSize: 1000,
      });
      return (res.data.files as DriveFile[]) || [];
    } catch (error) {
      console.error('Error listing drive files:', error);
      throw error;
    }
  }

  async getFileContent(fileId: string): Promise<string> {
    try {
      const res = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'text' }
      );
      return res.data as string;
    } catch (error) {
      console.error(`Error reading file ${fileId}:`, error);
      throw error;
    }
  }

  async getFileBuffer(fileId: string): Promise<Buffer> {
    try {
      const res = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );
      return Buffer.from(res.data as ArrayBuffer);
    } catch (error) {
       console.error(`Error reading file buffer ${fileId}:`, error);
       throw error;
    }
  }

  async getFileJson<T>(fileId: string): Promise<T> {
    const content = await this.getFileContent(fileId);
    return JSON.parse(content);
  }

  async findFileByName(name: string, parentId: string): Promise<DriveFile | null> {
    try {
      const res = await this.drive.files.list({
        q: `'${parentId}' in parents and name = '${name}' and trashed = false`,
        fields: 'files(id, name, mimeType)',
      });
      if (res.data.files && res.data.files.length > 0) {
        return res.data.files[0] as DriveFile;
      }
      return null;
    } catch (error) {
      console.error(`Error finding file ${name} in ${parentId}:`, error);
      return null;
    }
  }

  // Upload small text files
  async uploadFile(name: string, parentId: string, content: string, mimeType: string): Promise<string> {
    try {
      const existing = await this.findFileByName(name, parentId);
      
      const media = {
        mimeType,
        body: Readable.from([content]),
      };

      if (existing) {
        const res = await this.drive.files.update({
          fileId: existing.id,
          media,
        });
        return res.data.id!;
      } else {
        const res = await this.drive.files.create({
          requestBody: {
            name,
            parents: [parentId],
          },
          media,
        });
        return res.data.id!;
      }
    } catch (error) {
       console.error(`Error uploading file ${name}:`, error);
       throw error;
    }
  }

  async createFolder(name: string, parentId: string): Promise<DriveFile> {
    try {
      const existing = await this.findFileByName(name, parentId);
      if (existing && existing.mimeType === 'application/vnd.google-apps.folder') {
        return existing;
      }

      const res = await this.drive.files.create({
        requestBody: {
          name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId],
        },
        fields: 'id, name, mimeType',
      });
      return res.data as DriveFile;
    } catch (error) {
      console.error(`Error creating folder ${name}:`, error);
      throw error;
    }
  }

  // Generic upload for Streams (e.g. Audio)
  async uploadStream(name: string, parentId: string, stream: Readable, mimeType: string): Promise<string> {
     try {
       const existing = await this.findFileByName(name, parentId);
       const media = {
         mimeType,
         body: stream,
       };

       if (existing) {
         const res = await this.drive.files.update({
           fileId: existing.id,
           media,
         });
         return res.data.id!;
       } else {
         const res = await this.drive.files.create({
           requestBody: {
             name,
             parents: [parentId],
           },
           media,
         });
         return res.data.id!;
       }
     } catch (error) {
       console.error(`Error uploading stream ${name}:`, error);
       throw error;
     }
  }

  async deleteFile(fileId: string): Promise<void> {
    try {
      await this.drive.files.delete({
        fileId,
      });
    } catch (error) {
      console.error(`Error deleting file ${fileId}:`, error);
      throw error;
    }
  }
}

export const driveService = DriveService.getInstance();
