import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { createPresignedUpload } from "../services/s3";
import { enqueueExtractionJob } from "../services/extraction";

export const uploadRouter = Router();

const requestUploadSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  policyType: z.enum(["LIFE", "ANNUITY", "HEALTH"]),
});

// Step 1: client asks for a presigned S3 URL + creates the Policy shell row.
uploadRouter.post("/request-url", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = requestUploadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }
  const { fileName, contentType, policyType } = parsed.data;
  const userId = req.userId!;

  const { uploadUrl, s3Key } = await createPresignedUpload(userId, fileName, contentType);

  const policy = await prisma.policy.create({
    data: {
      userId,
      policyType,
      sourceFileKey: s3Key,
      sourceFileName: fileName,
    },
  });

  res.json({ uploadUrl, policyId: policy.id, s3Key });
});

// Step 2: client confirms the S3 upload finished; API enqueues extraction.
const confirmUploadSchema = z.object({ policyId: z.string().uuid() });

uploadRouter.post("/confirm", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = confirmUploadSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const policy = await prisma.policy.findFirst({
    where: { id: parsed.data.policyId, userId: req.userId },
  });
  if (!policy) {
    return res.status(404).json({ error: "Policy not found" });
  }

  await enqueueExtractionJob({
    policyId: policy.id,
    s3Key: policy.sourceFileKey,
    documentType: policy.policyType,
  });

  res.json({ status: "queued" });
});
