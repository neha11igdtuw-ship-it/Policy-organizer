import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { deleteObject } from "../services/s3";

// OUT OF SCOPE for this MVP (explicitly excluded, do not build here):
// - No recommendation engine (never suggest which policy/carrier to buy).
// - No carrier integrations or live quoting.
// - No payment processing.

export const policiesRouter = Router();

policiesRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const policies = await prisma.policy.findMany({
    where: { userId: req.userId },
    include: { fields: true, beneficiaries: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ policies });
});

policiesRouter.get("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const policy = await prisma.policy.findFirst({
    where: { id: req.params.id, userId: req.userId },
    include: { fields: true, beneficiaries: true, reminders: true },
  });
  if (!policy) return res.status(404).json({ error: "Policy not found" });
  res.json({ policy });
});

// Review screen: user confirms/corrects an extracted field.
const updateFieldSchema = z.object({
  fieldName: z.string(),
  value: z.string(),
  userConfirmed: z.boolean().default(true),
});

policiesRouter.patch("/:id/fields/:fieldId", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = updateFieldSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const policy = await prisma.policy.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!policy) return res.status(404).json({ error: "Policy not found" });

  const field = await prisma.policyField.update({
    where: { id: req.params.fieldId },
    data: {
      value: parsed.data.value,
      userConfirmed: parsed.data.userConfirmed,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: req.userId!,
      action: "POLICY_FIELD_CORRECTED",
      resourceType: "PolicyField",
      resourceId: field.id,
    },
  });

  res.json({ field });
});

// Right-to-deletion: hard-delete cascade. Soft delete is NOT sufficient for
// compliance here — see README "Right to deletion (hard delete)".
policiesRouter.delete("/:id", requireAuth, async (req: AuthedRequest, res) => {
  const policy = await prisma.policy.findFirst({
    where: { id: req.params.id, userId: req.userId },
  });
  if (!policy) return res.status(404).json({ error: "Policy not found" });

  // 1. Delete the source file from S3 first; if this throws, we abort before
  //    touching the DB so we never lose the pointer to an orphaned S3 object.
  await deleteObject(policy.sourceFileKey);

  // 2. Delete all dependent rows + the policy row itself in one transaction.
  await prisma.$transaction([
    prisma.policyField.deleteMany({ where: { policyId: policy.id } }),
    prisma.beneficiary.deleteMany({ where: { policyId: policy.id } }),
    prisma.reminder.deleteMany({ where: { policyId: policy.id } }),
    prisma.sharedAccess.deleteMany({ where: { policyId: policy.id } }),
    prisma.policy.delete({ where: { id: policy.id } }),
  ]);

  // 3. Record the deletion itself — the resource it refers to no longer
  //    exists, which is why AuditLog stores resourceId as a plain string
  //    rather than a foreign key.
  await prisma.auditLog.create({
    data: {
      userId: req.userId!,
      action: "POLICY_HARD_DELETE",
      resourceType: "Policy",
      resourceId: policy.id,
    },
  });

  res.status(204).send();
});
