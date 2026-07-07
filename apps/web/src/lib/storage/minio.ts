import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

const globalForStorage = globalThis as unknown as {
  s3Client?: S3Client;
};

function getS3Client() {
  if (globalForStorage.s3Client) {
    return globalForStorage.s3Client;
  }

  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error("S3 environment variables are not fully configured");
  }

  const client = new S3Client({
    endpoint,
    region: process.env.S3_REGION ?? "us-east-1",
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });

  globalForStorage.s3Client = client;
  return client;
}

function getBucket() {
  const bucket = process.env.S3_BUCKET;

  if (!bucket) {
    throw new Error("S3_BUCKET is not set");
  }

  return bucket;
}

function getPublicBaseUrl() {
  return (
    process.env.S3_PUBLIC_URL ??
    `${process.env.S3_ENDPOINT?.replace(/\/$/, "")}/${getBucket()}`
  );
}

export async function uploadOrganizationLogo(file: File, organizationId: string) {
  const client = getS3Client();
  const bucket = getBucket();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const key = `organizations/${organizationId}/logo-${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: file.type || "image/png",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return `${getPublicBaseUrl().replace(/\/$/, "")}/${key}`;
}

export async function deleteObjectByUrl(url: string) {
  const base = getPublicBaseUrl().replace(/\/$/, "");

  if (!url.startsWith(base)) {
    return;
  }

  const key = url.slice(base.length + 1);
  const client = getS3Client();

  await client.send(
    new DeleteObjectCommand({
      Bucket: getBucket(),
      Key: key,
    })
  );
}
