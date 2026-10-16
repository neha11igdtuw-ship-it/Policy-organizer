import { NextFunction, Request, Response } from "express";

// TODO(real-auth): Replace this stub with real Cognito JWT verification using
// `aws-jwt-verify`'s CognitoJwtVerifier, configured with
// process.env.COGNITO_USER_POOL_ID / COGNITO_CLIENT_ID / COGNITO_REGION.
//
//   import { CognitoJwtVerifier } from "aws-jwt-verify";
//   const verifier = CognitoJwtVerifier.create({
//     userPoolId: process.env.COGNITO_USER_POOL_ID!,
//     tokenUse: "id",
//     clientId: process.env.COGNITO_CLIENT_ID!,
//   });
//   const payload = await verifier.verify(token);
//
// The stub below trusts a plain bearer token and decodes a fake user id from
// it so the rest of the app has a real interface (`req.userId`) to code
// against. Do not ship this to production.

export interface AuthedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const authHeader = req.header("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing bearer token" });
  }

  const token = authHeader.slice("Bearer ".length);

  // STUB: in real life this is the verified Cognito `sub` claim.
  const fakeUserId = verifyTokenStub(token);
  if (!fakeUserId) {
    return res.status(401).json({ error: "Invalid token" });
  }

  req.userId = fakeUserId;
  next();
}

function verifyTokenStub(token: string): string | null {
  // TODO(real-auth): remove once CognitoJwtVerifier is wired up.
  if (!token) return null;
  return `stub-user-${token.slice(0, 8)}`;
}
