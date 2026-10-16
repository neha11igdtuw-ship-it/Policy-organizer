import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db/client";
import { AuthedRequest, requireAuth } from "../middleware/auth";
import { sendReminderEmail } from "../services/reminders";

export const remindersRouter = Router();

remindersRouter.get("/", requireAuth, async (req: AuthedRequest, res) => {
  const reminders = await prisma.reminder.findMany({
    where: { policy: { userId: req.userId } },
    include: { policy: true },
    orderBy: { dueDate: "asc" },
  });
  res.json({ reminders });
});

const createReminderSchema = z.object({
  policyId: z.string().uuid(),
  type: z.enum(["RENEWAL", "PREMIUM_DUE", "SURRENDER_WINDOW"]),
  dueDate: z.string().datetime(),
});

remindersRouter.post("/", requireAuth, async (req: AuthedRequest, res) => {
  const parsed = createReminderSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.flatten() });
  }

  const policy = await prisma.policy.findFirst({
    where: { id: parsed.data.policyId, userId: req.userId },
  });
  if (!policy) return res.status(404).json({ error: "Policy not found" });

  const reminder = await prisma.reminder.create({
    data: {
      policyId: policy.id,
      type: parsed.data.type,
      dueDate: new Date(parsed.data.dueDate),
    },
  });

  res.status(201).json({ reminder });
});

// Intended to be invoked by a scheduled job (e.g. daily Lambda/cron) rather
// than directly by the frontend. Sends any due-and-unsent reminder emails.
remindersRouter.post("/dispatch-due", async (_req, res) => {
  const now = new Date();
  const dueReminders = await prisma.reminder.findMany({
    where: { dueDate: { lte: now }, sentAt: null },
    include: { policy: { include: { user: true } } },
  });

  for (const reminder of dueReminders) {
    await sendReminderEmail({
      toEmail: reminder.policy.user.email,
      subject: `Policy reminder: ${reminder.type}`,
      bodyText: `Your policy ${reminder.policy.policyNumber ?? reminder.policyId} has an upcoming ${reminder.type} on ${reminder.dueDate.toDateString()}.`,
    });
    await prisma.reminder.update({ where: { id: reminder.id }, data: { sentAt: new Date() } });
  }

  res.json({ dispatched: dueReminders.length });
});
