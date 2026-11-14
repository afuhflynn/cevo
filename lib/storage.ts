import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  PREVIEW_URL_TTL_SEC,
  PUT_URL_TTL_SEC,
  sanitizeDownloadName,
} from "./files";

let client: S3Client | null = null;

export function bucketName(): string {
  const name = process.env["S3_BUCKET_NAME"];
  if (!name) throw new Error("S3_BUCKET_NAME is not configured");
  return name;
}

export function storageClient(): S3Client {
  if (client) return client;
  const endpoint = process.env["S3_ENDPOINT"];
  const region = process.env["S3_REGION"] || "us-east-1";
  const accessKeyId = process.env["S3_ACCESS_KEY_ID"];
  const secretAccessKey = process.env["S3_SECRET_ACCESS_KEY"];
  if (!endpoint) throw new Error("S3_ENDPOINT is not configured");
  if (!accessKeyId || !secretAccessKey)
    throw new Error("S3 storage credentials are not configured");
  const isLocal = /localhost|127\.0\.0\.1|minio/i.test(endpoint);
  client = new S3Client({
    endpoint,
    region: region === "auto" ? "us-east-1" : region,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: isLocal,
  });
  return client;
}

export async function presignPutUrl(
  key: string,
  mimeType: string,
  size: number,
): Promise<{ url: string; expiresInSec: number }> {
  const url = await getSignedUrl(
    storageClient(),
    new PutObjectCommand({
      Bucket: bucketName(),
      Key: key,
      ContentType: mimeType,
      ContentLength: size,
    }),
    { expiresIn: PUT_URL_TTL_SEC },
  );
  return { url, expiresInSec: PUT_URL_TTL_SEC };
}

export async function presignPreviewUrl(
  key: string,
  fileName: string,
  mimeType: string,
): Promise<{ url: string; expiresInSec: number }> {
  const safe = sanitizeDownloadName(fileName);
  const url = await getSignedUrl(
    storageClient(),
    new GetObjectCommand({
      Bucket: bucketName(),
      Key: key,
      ResponseContentDisposition: `inline; filename="${safe}"`,
      ResponseContentType: mimeType,
    }),
    { expiresIn: PREVIEW_URL_TTL_SEC },
  );
  return { url, expiresInSec: PREVIEW_URL_TTL_SEC };
}

export async function headObjectSize(key: string): Promise<number | null> {
  try {
    const out = await storageClient().send(
      new HeadObjectCommand({ Bucket: bucketName(), Key: key }),
    );
    return typeof out.ContentLength === "number" ? out.ContentLength : null;
  } catch {
    return null;
  }
}

export async function getObjectHeadBytes(
  key: string,
  length = 16,
): Promise<Uint8Array | null> {
  try {
    const out = await storageClient().send(
      new GetObjectCommand({
        Bucket: bucketName(),
        Key: key,
        Range: `bytes=0-${length - 1}`,
      }),
    );
    const body = out.Body;
    if (!body) return null;
    const chunks: Uint8Array[] = [];
    if (
      typeof (body as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] ===
      "function"
    ) {
      for await (const chunk of body as AsyncIterable<Uint8Array>)
        chunks.push(chunk);
    } else if (body instanceof Uint8Array) {
      chunks.push(body);
    } else {
      return null;
    }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }
    return merged;
  } catch {
    return null;
  }
}

export async function getObjectBytes(key: string): Promise<Uint8Array | null> {
  try {
    const out = await storageClient().send(
      new GetObjectCommand({ Bucket: bucketName(), Key: key }),
    );
    const body = out.Body;
    if (!body) return null;
    const chunks: Uint8Array[] = [];
    if (
      typeof (body as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] ===
      "function"
    ) {
      for await (const chunk of body as AsyncIterable<Uint8Array>)
        chunks.push(chunk);
    } else if (body instanceof Uint8Array) {
      return body;
    } else {
      return null;
    }
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const merged = new Uint8Array(total);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }
    return merged;
  } catch {
    return null;
  }
}

export async function deleteStorageObject(key: string): Promise<boolean> {
  try {
    await storageClient().send(
      new DeleteObjectCommand({ Bucket: bucketName(), Key: key }),
    );
    return true;
  } catch {
    return false;
  }
}
