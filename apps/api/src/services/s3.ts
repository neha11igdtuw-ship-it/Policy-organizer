// S3 integration for policy document uploads and hard-deletion.
//
// TODO(real-aws): Swap the stub bodies below for real @aws-sdk/client-s3 and
// @aws-sdk/s3-request-presigner calls. The interface (function signatures) is
// intentionally the real shape so callers never need to change.

import { PutObjectCommand, DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.S3_UPLOAD_BUCKET ?? "policy-organizer-uploads-dev";
const PRESIGN_EXPIRY = Number(process.env.S3_PRESIGN_EXPIRY_SECONDS ?? 900);

const s3Client = new S3Client({ region: process.env.AWS_REGION ?? "us-east-1" });

export interface PresignedUpload {
  uploadUrl: string;
  s3Key: string;
}

/**
 * Issues a presigned PUT URL so the browser can upload the policy document
 * directly to S3 without routing the file bytes through the API.
 */
export async function createPresignedUpload(
  userId: string,
  fileName: string,
  contentType: string
): Promise<PresignedUpload> {
  const s3Key = `users/${userId}/policies/${Date.now()}-${sanitizeFileName(fileName)}`;

  // TODO(real-aws): this issues a real presigned URL once credentials/bucket
  // exist; for local dev without AWS creds configured this call will throw,
  // so local development should mock this service.
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: s3Key,
    ContentType: contentType,
    // TODO(real-aws): set ServerSideEncryption + SSEKMSKeyId to the per-user
    // KMS key once the key-per-user strategy in infra/README.md is finalized.
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn: PRESIGN_EXPIRY });
  return { uploadUrl, s3Key };
}

/**
 * Hard-deletes the underlying object. Used by the policy hard-delete cascade
 * (see routes/policies.ts) — this must be called synchronously as part of
 * DELETE /api/policies/:id, not deferred to a lifecycle rule.
 */
export async function deleteObject(s3Key: string): Promise<void> {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: s3Key });
  await s3Client.send(command);
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}
