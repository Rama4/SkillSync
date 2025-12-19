import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { DATA_DIR } from "@/lib/constants";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: pathSegments } = await params;
    const filePath = pathSegments.join("/");

    // Security: prevent directory traversal
    if (filePath.includes("..") || filePath.includes("~")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const fullPath = path.join(DATA_DIR, filePath);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const stats = fs.statSync(fullPath);
    if (!stats.isFile()) {
      return NextResponse.json({ error: "Not a file" }, { status: 400 });
    }

    // Determine content type
    const ext = path.extname(fullPath).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".mp4") contentType = "video/mp4";
    else if (ext === ".webm") contentType = "video/webm";
    else if (ext === ".ogg") contentType = "video/ogg";
    else if (ext === ".mov") contentType = "video/quicktime";
    else if (ext === ".avi") contentType = "video/x-msvideo";
    else if (ext === ".mkv") contentType = "video/x-matroska";
    else if (ext === ".md" || ext === ".markdown")
      contentType = "text/markdown";
    else if (ext === ".json") contentType = "application/json";
    else if (ext === ".txt") contentType = "text/plain";

    // Handle Byte Ranges for Video Seeking

    const range = request.headers.get("range");
    const fileSize = stats.size;

    // If there is a Range header (standard for video players)
    if (range) {
      // Parse the range (e.g., "bytes=32324-")
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      // Calculate chunk size
      const chunksize = end - start + 1;

      // Create a stream for JUST that part of the file
      // @ts-ignore: Next.js Stream types can be finicky, but fs streams work in NextResponse
      const stream = fs.createReadStream(fullPath, { start, end });

      const head = {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize.toString(),
        "Content-Type": contentType,
      };

      // Return status 206 (Partial Content)
      return new NextResponse(stream as any, {
        status: 206,
        headers: head,
      });
    } else {
      // ----------------------------------------------------------------
      // Fallback: No Range header (e.g. downloading the file)
      // ----------------------------------------------------------------
      const head = {
        "Content-Length": fileSize.toString(),
        "Content-Type": contentType,
      };

      // Use Streams here too instead of readFileSync to save RAM
      // @ts-ignore
      const stream = fs.createReadStream(fullPath);

      return new NextResponse(stream as any, {
        status: 200,
        headers: head,
      });
    }
  } catch (error) {
    console.error("Error serving media file:", error);
    return NextResponse.json(
      { error: "Failed to serve file" },
      { status: 500 }
    );
  }
}
