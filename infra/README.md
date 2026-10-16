# Infrastructure Notes (MVP)

No CDK/Terraform yet for this scaffold — this document is the source of truth
for what needs to be provisioned, and the env vars each piece requires. See
`.env.example` at the repo root.

## AWS resources

### Cognito User Pool
- Pool with MFA **required** (TOTP or SMS) for all users.
- App client used by `apps/web` for the hosted-UI / SRP auth flow.
- `apps/api/src/middleware/auth.ts` verifies the JWT (`id_token`/`access_token`)
  against the pool's JWKS — currently stubbed, see TODOs in that file.
- Env: `COGNITO_USER_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_REGION`.

### S3 bucket (`S3_UPLOAD_BUCKET`)
- One bucket for uploaded policy documents (PDFs/photos).
- Server-side encryption with a **per-user KMS key** (or a per-user prefix +
  bucket key with strict IAM conditions) so one user's documents can't be
  decrypted using another user's grant — exact key strategy to be finalized
  before launch; for MVP, document the intent in the bucket policy comments.
- Lifecycle rule: documents deleted via the hard-delete cascade in the API
  (`DELETE /api/policies/:id`) must be removed from S3 synchronously as part of
  that request, not just via a lifecycle rule.
- Presigned PUT URLs are issued by the API (`apps/api/src/services/s3.ts`,
  stubbed) so the browser uploads directly to S3.

### RDS Postgres
- Single Postgres instance/cluster for MVP. `DATABASE_URL` is used by both
  `apps/api` (Prisma) and `workers/extraction` (writes extracted fields).
- Prisma schema: `apps/api/prisma/schema.prisma`.

### SQS queue (extraction jobs)
- Queue between the API and the Python extraction worker:
  `SQS_EXTRACTION_QUEUE_URL`.
- API enqueues `{ policyId, s3Key, documentType }` after a successful upload
  (`apps/api/src/services/extraction.ts`, stubbed).
- Worker (`workers/extraction/main.py`) polls the queue, runs OCR + LLM
  extraction, writes results back via `DATABASE_URL`.

### SES
- Used for reminder emails (renewal/surrender dates, premium due) and the
  family-share invite email.
- Env: `SES_FROM_ADDRESS`, `SES_REGION`. Sending is stubbed in
  `apps/api/src/services/reminders.ts`.

### Compute
- `apps/api` can run on ECS Fargate or Lambda (behind API Gateway); MVP assumes
  a long-running container (ECS) for simplicity.
- `workers/extraction` runs as a long-poll worker on ECS Fargate (or a
  scheduled Lambda if job volume is low).

## Required env vars (summary)

See `.env.example`. Grouped by: `apps/api`, `apps/web`, `workers/extraction`.
