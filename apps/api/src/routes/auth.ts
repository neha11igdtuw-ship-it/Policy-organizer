import { Router } from "express";
import { prisma } from "../db/client";

// TODO(real-auth): This route is a thin stub for local dev so the rest of the
// app has something to call. Real auth (sign-up/sign-in/MFA) happens against
// Cognito Hosted UI / SRP flow from apps/web directly; the API's job is only
// to verify the resulting JWT (see middleware/auth.ts) and to make sure a
// corresponding `User` row exists ("just-in-time" provisioning) below.

export const authRouter = Router();

authRouter.post("/sync-user", async (req, res) => {
  const { cognitoSub, email, fullName } = req.body as {
    cognitoSub?: string;
    email?: string;
    fullName?: string;
  };

  if (!cognitoSub || !email || !fullName) {
    return res.status(400).json({ error: "cognitoSub, email, fullName are required" });
  }

  const user = await prisma.user.upsert({
    where: { cognitoSub },
    update: { email, fullName },
    create: { cognitoSub, email, fullName },
  });

  res.json({ user });
});
