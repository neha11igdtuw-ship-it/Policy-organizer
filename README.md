# Policy Organizer (MVP Scaffold)

AI-assisted organizer for life/annuity/health insurance policies. A user uploads a
policy PDF or photo, an LLM-based extraction pipeline pulls out structured fields
(carrier, policy number, coverage amount, premium, beneficiaries, riders, dates),
the user reviews/corrects the extracted data, then gets a dashboard, a
plain-language explainer, renewal/premium reminders, and can grant one family
member read-only access.

This repo is an MVP **code scaffold** — real TypeScript/Python, wired together,
but with AWS integrations (Cognito, Textract, SES, S3, SQS) stubbed behind clear
interfaces so they can be swapped for live SDK calls without changing callers.

## Architecture

```
apps/web      React + TypeScript (Vite) SPA
apps/api      Node.js + TypeScript (Express) REST API, Prisma/Postgres
workers/
  extraction  Python worker: pulls jobs from SQS, runs OCR (Textract stub),
              calls an LLM with a strict JSON schema prompt to extract fields,
              writes per-field confidence scores back to the DB
infra         AWS resource notes (no CDK/Terraform yet) + env vars
```

Flow: web uploads a file via a presigned S3 URL issued by the API -> API enqueues
an extraction job on SQS -> Python worker picks it up, OCRs the doc, calls the
LLM extraction prompt, writes `PolicyField` rows with confidence scores -> user
reviews/corrects fields in the Review page -> Dashboard/PolicyDetail render the
confirmed data and an LLM-generated plain-language explainer -> Reminders are
derived from renewal/surrender dates and sent via SES -> Share page grants a
single family member **read-only** access via `SharedAccess`.

## Setup

1. `cp .env.example .env` and fill in real values (or leave stubs for local dev).
2. Install dependencies per workspace (not run automatically by this scaffold):
   - `cd apps/web && npm install`
   - `cd apps/api && npm install && npx prisma generate`
   - `cd workers/extraction && pip install -r requirements.txt`
3. Start Postgres locally (or point `DATABASE_URL` at one), then
   `cd apps/api && npx prisma migrate dev --name init`.
4. Run the API: `npm run dev --workspace=apps/api` (defaults to port 4000).
5. Run the web app: `npm run dev --workspace=apps/web` (Vite dev server, proxies
   to `VITE_API_BASE_URL`).
6. Run the extraction worker: `cd workers/extraction && python main.py`
   (polls the stubbed queue; see `services/extraction.ts` on the API side for
   the producer interface).

## Environment variables

See `.env.example` for the full list, grouped by app. Nothing in this scaffold
makes real calls to Cognito, Textract, SES, S3, or SQS yet — those are stubbed
(see `apps/api/src/services/*.ts` and `workers/extraction/main.py`) behind
interfaces so real AWS SDK calls can be dropped in later.

## Compliance / safety notes baked into the code

- **No recommendations.** Every LLM-facing prompt (`workers/extraction/prompts/extraction_prompt.py`,
  `workers/extraction/explainer.py`) embeds a system instruction that outputs are
  informational only and must refuse to recommend buying, switching, or
  surrendering a policy. This is NOT just a README note — it's a constant
  concatenated into every prompt sent to the LLM.
- **Confidence scoring.** Every extracted field is stored as a `PolicyField` row
  with `confidenceScore` (0-1) and `userConfirmed` (boolean), which is how the
  review screen works and how we'll measure the "70% of fields accepted without
  edits" product metric later.
- **Read-only sharing.** `SharedAccess` has no write-scope concept at all — it
  is modeled as strictly read-only by design, not by a permission check that
  could be bypassed.
- **Right to deletion (hard delete).** Soft-delete flags are not sufficient for
  compliance. `DELETE /api/policies/:id` (see `apps/api/src/routes/policies.ts`)
  performs a hard-delete cascade:
  1. Delete the source file(s) from S3 (`services/s3.ts#deleteObject`).
  2. Delete `PolicyField`, `Beneficiary`, `Reminder`, and `SharedAccess` rows
     scoped to the policy, then the `Policy` row itself, in a single DB
     transaction.
  3. Write an `AuditLog` row (`userId`, `action: "POLICY_HARD_DELETE"`,
     `resourceType: "Policy"`, `resourceId`, `timestamp`) recording the deletion
     itself, since the record it refers to no longer exists.

## Explicitly out of scope for this MVP

- No recommendation engine (which policy/carrier to buy).
- No carrier integrations or live quoting.
- No payment processing.

These are intentionally excluded — see the `OUT OF SCOPE` comments in
`workers/extraction/explainer.py` and `apps/api/src/routes/policies.ts`.
