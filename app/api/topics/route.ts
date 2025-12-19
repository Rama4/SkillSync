import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { TopicRegistrationRequest } from "@/lib/types";
import {
  slugify,
  copyFile,
  generateLessonFromMedia,
  generateTopicJson,
  createTopicDirectory,
  updateTopicsIndex,
} from "@/lib/fileUtils";
import { DATA_DIR } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const body: TopicRegistrationRequest = await request.json();

    // Validate request
    if (!body.title || !body.mediaFiles || body.mediaFiles.length === 0) {
      return NextResponse.json(
        { error: "Title and at least one media file are required" },
        { status: 400 }
      );
    }

    // Generate topic ID
    const topicId = slugify(body.title);

    // Check if topic already exists
    const topicPath = path.join(DATA_DIR, topicId);
    if (fs.existsSync(topicPath)) {
      return NextResponse.json(
        { error: `Topic with ID "${topicId}" already exists` },
        { status: 409 }
      );
    }

    // Create topic directory structure
    const { topicDir, lessonsDir, mediaDir } = createTopicDirectory(topicId);

    // Copy media files and generate lessons
    const lessons = [];
    for (let i = 0; i < body.mediaFiles.length; i++) {
      const mediaFile = body.mediaFiles[i];

      // Copy file to media directory
      const destPath = path.join("media", mediaFile.name);
      const fullDestPath = path.join(topicDir, destPath);

      // Ensure media directory exists
      if (!fs.existsSync(mediaDir)) {
        fs.mkdirSync(mediaDir, { recursive: true });
      }

      // Copy file
      const sourcePath = path.join(DATA_DIR, mediaFile.path);
      if (!fs.existsSync(sourcePath)) {
        return NextResponse.json(
          { error: `Source file not found: ${mediaFile.path}` },
          { status: 404 }
        );
      }

      fs.copyFileSync(sourcePath, fullDestPath);

      // Generate lesson
      const previousLessonId = i > 0 ? lessons[i - 1].id : null;
      const nextLessonId = i < body.mediaFiles.length - 1 ? null : null;

      const lesson = generateLessonFromMedia(
        mediaFile,
        topicId,
        i + 1,
        previousLessonId,
        nextLessonId
      );

      // Set nextLesson for previous lesson
      if (i > 0) {
        lessons[i - 1].nextLesson = lesson.id;
        lesson.previousLesson = lessons[i - 1].id;
      }

      lessons.push(lesson);
    }

    // Update previousLesson references
    for (let i = 0; i < lessons.length; i++) {
      if (i > 0) {
        lessons[i].previousLesson = lessons[i - 1].id;
      }
      if (i < lessons.length - 1) {
        lessons[i].nextLesson = lessons[i + 1].id;
      }
    }

    // Save lesson JSON files
    for (const lesson of lessons) {
      const lessonPath = path.join(lessonsDir, `${lesson.id}.json`);
      fs.writeFileSync(lessonPath, JSON.stringify(lesson, null, 2), "utf-8");
    }

    // Generate and save topic.json
    const topicMeta = generateTopicJson(
      topicId,
      body.title,
      body.description || "",
      body.tags || [],
      lessons
    );

    const topicJsonPath = path.join(topicDir, "topic.json");
    fs.writeFileSync(
      topicJsonPath,
      JSON.stringify(topicMeta, null, 2),
      "utf-8"
    );

    // Update the topics index file
    updateTopicsIndex(topicMeta);

    return NextResponse.json({
      success: true,
      topicId,
      message: `Topic "${body.title}" registered successfully`,
    });
  } catch (error) {
    console.error("Error registering topic:", error);
    return NextResponse.json(
      {
        error: "Failed to register topic",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to scan available media files
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const directory = searchParams.get("directory") || "test";

    const files: Array<{
      path: string;
      name: string;
      type: string;
      size?: number;
    }> = [];
    const fullPath = path.join(DATA_DIR, directory);

    if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isDirectory()) {
      return NextResponse.json({ files: [] });
    }

    const entries = fs.readdirSync(fullPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile()) {
        const filePath = path.join(directory, entry.name);
        const stats = fs.statSync(path.join(fullPath, entry.name));
        const ext = path.extname(entry.name).toLowerCase();

        let fileType = "other";
        if ([".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"].includes(ext)) {
          fileType = "video";
        } else if ([".md", ".markdown"].includes(ext)) {
          fileType = "markdown";
        }

        files.push({
          path: filePath,
          name: entry.name,
          type: fileType,
          size: stats.size,
        });
      }
    }

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Error scanning media files:", error);
    return NextResponse.json(
      {
        error: "Failed to scan media files",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
