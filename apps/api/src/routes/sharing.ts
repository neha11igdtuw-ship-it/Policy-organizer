import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { sendReminderEmail } from "../services/reminders";

// SharedAccess is read-only by design (see prisma/schema.prisma) — there is no
// write-scope concept modeled anywhere in this router or the schema. The
// invited family member can only ever view policy data through a dedicated
// read-only endpoint (GET /api/sharing/:token below is illustrative; a real
// implementation would use a signed, single-purpose share token rather than
// the owner's own auth).

export const sharingRouter = Router();

const inviteSchema = z.object({
  policyId: z.string().uuid(),
  invitedEmail: z.string().email(),
});

sharingRouter.post("/invite", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const policy = await prisma.policy.findFirst({
    where: { id: parsed.data.policyId, userId: req.userId },
  });
  if (!policy) return res.status(404).json({ error: "Policy not found" });

  // MVP constraint: one family member per policy owner, enforced here rather
  // than only in the UI.
  const existing = await prisma.sharedAccess.findFirst({
    where: { policyId: policy.id, revokedAt: null },
  });
  if (existing) {
    return res.status(409).json({ error: "This policy is already shared with someone" });
  }

  const shared = await prisma.sharedAccess.create({
    data: { policyId: policy.id, invitedEmail: parsed.data.invitedEmail },
  });

  await sendReminderEmail({
    toEmail: parsed.data.invitedEmail,
    subject: "You've been invited to view a policy on Policy Organizer",
    bodyText: `You now have read-only access to a policy shared by the account owner.`,
  });

  await prisma.auditLog.create({
    data: {
      userId: req.userId!,
      action: "SHARE_GRANTED",
      resourceType: "SharedAccess",
      resourceId: shared.id,
    },
  });

  res.status(201).json({ sharedAccess: shared });
});

sharingRouter.post("/:id/revoke", requireAuth, async (req: AuthedRequest, res) => {
  const shared = await prisma.sharedAccess.findFirst({
    where: { id: req.params.id, policy: { userId: req.userId } },
  });
  if (!shared) return res.status(404).json({ error: "Share not found" });

  await prisma.sharedAccess.update({
    where: { id: shared.id },
    data: { revokedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      userId: req.userId!,
      action: "SHARE_REVOKED",
      resourceType: "SharedAccess",
      resourceId: shared.id,
    },
  });

  res.status(204).send();
});

// Read-only view for the invited family member. No PATCH/DELETE/POST
// equivalents exist on this router for the invitee's side — intentionally.
sharingRouter.get("/shared-with-me", requireAuth, async (req: AuthedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const shares = await prisma.sharedAccess.findMany({
    where: { invitedEmail: user.email, revokedAt: null },
    include: { policy: { include: { fields: true } } },
  });

  res.json({ shares });
});
