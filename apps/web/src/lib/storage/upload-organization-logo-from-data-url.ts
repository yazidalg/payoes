export async function uploadOrganizationLogoFromDataUrl(
  dataUrl: string,
  organizationId: string,
) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) {
    throw new Error("Invalid image data");
  }

  const contentType = match[1];
  const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];

  if (!allowedTypes.includes(contentType)) {
    throw new Error("Logo must be a PNG, JPG, WEBP, or GIF image");
  }

  const extension =
    contentType === "image/png"
      ? "png"
      : contentType === "image/jpeg"
        ? "jpg"
        : contentType === "image/webp"
          ? "webp"
          : "gif";

  const buffer = Buffer.from(match[2], "base64");

  if (buffer.byteLength > 2 * 1024 * 1024) {
    throw new Error("Logo must be smaller than 2 MB");
  }

  const { PutObjectCommand, S3Client } = await import("@aws-sdk/client-s3");
  const { randomUUID } = await import("node:crypto");

  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;
  const bucket = process.env.S3_BUCKET;

  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
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

  const key = `organizations/${organizationId}/logo-${randomUUID()}.${extension}`;
  const publicBaseUrl =
    process.env.S3_PUBLIC_URL ??
    `${endpoint.replace(/\/$/, "")}/${bucket}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );

  return `${publicBaseUrl.replace(/\/$/, "")}/${key}`;
}
