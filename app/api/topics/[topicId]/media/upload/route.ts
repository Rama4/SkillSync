import {NextRequest, NextResponse} from 'next/server';
import fs from 'fs';
import path from 'path';
import {DATA_DIR} from '@/lib/constants';

export async function POST(request: NextRequest, {params}: {params: Promise<{topicId: string}>}) {
  try {
    const {topicId} = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({error: 'No file provided'}, {status: 400});
    }

    // Ensure media directory exists
    const mediaDir = path.join(DATA_DIR, topicId, 'media');
    if (!fs.existsSync(mediaDir)) {
      fs.mkdirSync(mediaDir, {recursive: true});
    }

    // Generate unique filename if file already exists
    let fileName = file.name;
    let filePath = path.join(mediaDir, fileName);
    let counter = 1;
    while (fs.existsSync(filePath)) {
      const ext = path.extname(file.name);
      const nameWithoutExt = path.parse(file.name).name;
      fileName = `${nameWithoutExt}_${counter}${ext}`;
      filePath = path.join(mediaDir, fileName);
      counter++;
    }

    // Convert file to buffer and save
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    fs.writeFileSync(filePath, buffer);

    // Return relative path (relative to topic folder)
    const relativePath = `media/${fileName}`;

    return NextResponse.json({filePath: relativePath, fileName});
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json({error: 'Failed to upload file'}, {status: 500});
  }
}
