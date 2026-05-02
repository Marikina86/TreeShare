import express, { Router, type IRouter, type Request, type Response } from "express";
import { randomUUID } from "crypto";
import { createWriteStream, createReadStream, existsSync, mkdirSync, statSync } from "fs";
import { join } from "path";
import { RequestUploadUrlBody } from "@workspace/api-zod";
import { v2 as cloudinary } from "cloudinary";

const router: IRouter = Router();

const UPLOADS_DIR = join(process.cwd(), "uploads");
mkdirSync(UPLOADS_DIR, { recursive: true });

function extractCloudinaryCloudName(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  // Handle full URL format: cloudinary://key:secret@cloudname or CLOUDINARY_URL=cloudinary://...@cloudname
  const match = raw.match(/@([a-zA-Z0-9_-]+)\s*$/);
  if (match) return match[1];
  // Return as-is if it looks like a plain cloud name
  return raw.trim();
}

function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

if (isCloudinaryConfigured()) {
  const cloudName = extractCloudinaryCloudName(process.env.CLOUDINARY_CLOUD_NAME);
  cloudinary.config({
    cloud_name: cloudName,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

async function uploadToCloudinary(buffer: Buffer, uuid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "treeshare",
        public_id: uuid,
        resource_type: "image",
        transformation: [
          { width: 1200, height: 1200, crop: "limit", quality: "auto:good", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error || !result) return reject(error ?? new Error("Cloudinary upload failed"));
        resolve(result.secure_url);
      }
    );
    uploadStream.end(buffer);
  });
}

const CONTENT_TYPE_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  heic: "image/heic",
};

function getContentType(uuid: string): string {
  const ext = uuid.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPE_MAP[ext] ?? "image/jpeg";
}

router.post("/storage/uploads/request-url", (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  const { name, size, contentType } = parsed.data;
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "jpg";
  const uuid = `${randomUUID()}.${ext}`;
  const uploadURL = `/api/storage/upload-direct/${uuid}`;

  res.json({ uploadURL, metadata: { name, size, contentType } });
});

router.put(
  "/storage/upload-direct/:uuid",
  express.raw({ type: "*/*", limit: "25mb" }),
  async (req: Request, res: Response) => {
    const uuid = req.params.uuid as string;
    if (!uuid || uuid.length > 100 || /[^a-zA-Z0-9.\-_]/.test(uuid)) {
      res.status(400).json({ error: "Invalid upload ID" });
      return;
    }

    const body = req.body as Buffer;
    if (!body || body.length === 0) {
      res.status(400).json({ error: "Empty upload body" });
      return;
    }

    try {
      if (isCloudinaryConfigured()) {
        const cleanId = uuid.replace(/\.[^.]+$/, "");
        const cdnUrl = await uploadToCloudinary(body, cleanId);
        res.status(200).json({ success: true, finalObjectPath: cdnUrl });
      } else {
        const filePath = join(UPLOADS_DIR, uuid);
        await new Promise<void>((resolve, reject) => {
          const ws = createWriteStream(filePath);
          ws.write(body, (err) => {
            if (err) return reject(err);
            ws.end(resolve);
          });
        });
        res.status(200).json({ success: true, finalObjectPath: `/objects/uploads/${uuid}` });
      }
    } catch (err) {
      req.log?.error({ err }, "Upload failed");
      res.status(500).json({ error: "Upload failed" });
    }
  }
);

router.get("/storage/objects/uploads/:uuid", (req: Request, res: Response) => {
  const uuid = req.params.uuid as string;
  if (!uuid || uuid.length > 100 || /[^a-zA-Z0-9.\-_]/.test(uuid)) {
    res.status(400).json({ error: "Invalid file ID" });
    return;
  }

  const filePath = join(UPLOADS_DIR, uuid);
  if (!existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  try {
    const stat = statSync(filePath);
    res.setHeader("Content-Type", getContentType(uuid));
    res.setHeader("Content-Length", stat.size);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    createReadStream(filePath).pipe(res);
  } catch (err) {
    req.log?.error({ err }, "Error serving file");
    res.status(500).json({ error: "Failed to serve file" });
  }
});

router.get("/storage/objects/*path", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Object not found" });
});

router.get("/storage/public-objects/*filePath", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Public object not found" });
});

export default router;
