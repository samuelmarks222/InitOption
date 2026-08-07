import type { IncomingMessage, ServerResponse } from "node:http";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

type ApiRequest = IncomingMessage & {
  headers: Record<string, string | string[] | undefined>;
  method?: string;
};

type ApiResponse = ServerResponse<IncomingMessage>;

const sendJson = (response: ApiResponse, statusCode: number, payload: Record<string, unknown>) => {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
};

const readRawBody = async (request: ApiRequest): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

export default async function handler(request: ApiRequest, response: ApiResponse) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    sendJson(response, 405, { error: "Method not allowed" });
    return;
  }

  const contentType = request.headers["content-type"] ?? "";
  if (!contentType.includes("multipart/form-data")) {
    sendJson(response, 400, { error: "Content-Type must be multipart/form-data" });
    return;
  }

  const boundary = contentType.split("boundary=")[1];
  if (!boundary) {
    sendJson(response, 400, { error: "Missing boundary in multipart request" });
    return;
  }

  try {
    const rawBody = await readRawBody(request);
    const parts = parseMultipart(rawBody, boundary);

    const filePart = parts.find(p => p.name === "file");
    const folderPart = parts.find(p => p.name === "folder");

    if (!filePart) {
      sendJson(response, 400, { error: "No file provided" });
      return;
    }

    const folder = folderPart?.value as string ?? "uploads";

    const uploadResult = await uploadToCloudinary(filePart.data, {
      folder,
      public_id: filePart.filename ? filePart.filename.replace(/\.[^/.]+$/, "") : undefined,
      resource_type: "auto",
    });

    sendJson(response, 200, {
      url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
      format: uploadResult.format,
      width: uploadResult.width,
      height: uploadResult.height,
      bytes: uploadResult.bytes,
    });
  } catch (error) {
    console.error("Cloudinary upload failed:", error);
    sendJson(response, 500, {
      error: error instanceof Error ? error.message : "Upload failed",
    });
  }
};

function parseMultipart(buffer: Buffer, boundary: string): Array<{ name: string; filename?: string; data: Buffer; value?: string }> {
  const parts: Array<{ name: string; filename?: string; data: Buffer; value?: string }> = [];
  const boundaryBuffer = Buffer.from(`\r\n--${boundary}\r\n`);
  const endBoundaryBuffer = Buffer.from(`\r\n--${boundary}--\r\n`);

  let start = 0;
  while (true) {
    const partStart = buffer.indexOf(boundaryBuffer, start);
    if (partStart === -1) break;

    const partEnd = buffer.indexOf(boundaryBuffer, partStart + boundaryBuffer.length);
    if (partEnd === -1) {
      const endPos = buffer.indexOf(endBoundaryBuffer, partStart + boundaryBuffer.length);
      if (endPos === -1) break;
    }

    const partData = buffer.slice(partStart + boundaryBuffer.length, partEnd ?? buffer.length - endBoundaryBuffer.length);
    const headerEnd = partData.indexOf("\r\n\r\n");
    
    if (headerEnd === -1) continue;

    const headers = partData.slice(0, headerEnd).toString();
    const body = partData.slice(headerEnd + 4);

    const contentDisposition = headers.match(/name="([^"]+)"/)?.[1];
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const filename = filenameMatch?.[1];

    if (contentDisposition) {
      parts.push({
        name: contentDisposition,
        filename,
        data: body,
        value: filename ? undefined : body.toString(),
      });
    }

    start = partEnd ?? buffer.length;
  }

  return parts;
}

type UploadResponse = {
  public_id?: string;
  secure_url?: string;
  [key: string]: unknown;
};

async function uploadToCloudinary(
  buffer: Buffer,
  options: { folder: string; public_id?: string; resource_type?: "auto" | "image" | "video" | "raw" }
): Promise<UploadResponse> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: options.folder, public_id: options.public_id, resource_type: options.resource_type },
      (error, result) => {
        if (error) reject(error);
        else resolve((result as UploadResponse | null) ?? {});
      }
    );
    uploadStream.end(buffer);
  });
}