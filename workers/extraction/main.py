"""Extraction worker entrypoint.

Polls the SQS queue the API enqueues jobs onto (see
apps/api/src/services/extraction.ts), runs OCR (Textract stub) on the
uploaded document, calls the LLM extraction prompt, and writes the resulting
fields + confidence scores back into Postgres via PolicyField rows.

Run locally: `python main.py` (polls in a loop; Ctrl-C to stop).
"""

from __future__ import annotations

import json
import os
import time

import boto3
import psycopg2
from dotenv import load_dotenv

from explainer import generate_explainer
from prompts.extraction_prompt import build_extraction_prompt
from schema import ExtractionJob, PolicyExtraction

load_dotenv()

QUEUE_URL = os.environ.get("SQS_EXTRACTION_QUEUE_URL")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
S3_BUCKET = os.environ.get("S3_UPLOAD_BUCKET", "policy-organizer-uploads-dev")
DATABASE_URL = os.environ.get("DATABASE_URL")

POLL_INTERVAL_SECONDS = 5


def get_sqs_client():
    # TODO(real-aws): this is a real boto3 client; it will raise if credentials
    # or the queue don't exist yet, which is expected for local dev without
    # AWS configured. See `run_textract_stub` / `fetch_jobs_stub` below for the
    # local-dev fallback path.
    return boto3.client("sqs", region_name=AWS_REGION)


def run_textract_stub(s3_key: str) -> str:
    """TODO(real-aws): replace with a real Amazon Textract call
    (DetectDocumentText / AnalyzeDocument) against s3://{S3_BUCKET}/{s3_key}.

    For now, returns a clearly-fake placeholder so the rest of the pipeline
    (LLM extraction, DB writes) is exercisable without AWS credentials.
    """
    return (
        "STUB OCR OUTPUT (no real Textract call made). "
        f"Document key: {s3_key}. "
        "Replace workers/extraction/main.py#run_textract_stub with a real "
        "Textract call before processing real customer documents."
    )


def call_llm_extraction_stub(ocr_text: str) -> PolicyExtraction:
    """TODO(real-llm): replace with a real call to the configured LLM
    (see explainer.py for the OpenAI client pattern) using
    `build_extraction_prompt(ocr_text)` as the prompt, then
    `PolicyExtraction.model_validate_json(response_text)` on the result.

    Returns a deterministic low-confidence stub extraction so downstream code
    (DB writes, review UI) has real shaped data to work with locally.
    """
    prompt = build_extraction_prompt(ocr_text)  # noqa: F841 (kept for real impl)
    return PolicyExtraction.model_validate(
        {
            "carrier": {"value": None, "confidence": 0.0},
            "policy_type": {"value": None, "confidence": 0.0},
            "policy_number": {"value": None, "confidence": 0.0},
            "coverage_amount": {"value": None, "confidence": 0.0},
            "premium": {"value": None, "confidence": 0.0},
            "renewal_date": {"value": None, "confidence": 0.0},
            "surrender_date": {"value": None, "confidence": 0.0},
            "beneficiaries": [],
            "riders": [],
        }
    )


def write_fields_to_db(policy_id: str, extraction: PolicyExtraction) -> None:
    if not DATABASE_URL:
        print("[worker] DATABASE_URL not set; skipping DB write (dev mode)")
        return

    rows = extraction.to_field_rows()
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn, conn.cursor() as cur:
            for row in rows:
                # Mirrors the PolicyField @@unique([policyId, fieldName])
                # constraint in apps/api/prisma/schema.prisma.
                cur.execute(
                    """
                    INSERT INTO "PolicyField" (id, "policyId", "fieldName", value, "confidenceScore", "userConfirmed", "createdAt", "updatedAt")
                    VALUES (gen_random_uuid(), %s, %s, %s, %s, %s, now(), now())
                    ON CONFLICT ("policyId", "fieldName")
                    DO UPDATE SET value = EXCLUDED.value, "confidenceScore" = EXCLUDED."confidenceScore", "updatedAt" = now()
                    """,
                    (policy_id, row["fieldName"], row["value"], row["confidenceScore"], row["userConfirmed"]),
                )
    finally:
        conn.close()


def process_job(job: ExtractionJob) -> None:
    print(f"[worker] processing job for policy {job.policyId}")
    ocr_text = run_textract_stub(job.s3Key)
    extraction = call_llm_extraction_stub(ocr_text)
    write_fields_to_db(job.policyId, extraction)

    # Also generate the plain-language explainer; a real implementation would
    # persist this (e.g. a PolicyExplainer table or a column on Policy) — left
    # as a TODO since it's outside the MVP's core data model ask.
    explainer_text = generate_explainer_safe(ocr_text)
    print(f"[worker] explainer for {job.policyId}:\n{explainer_text}\n")


def generate_explainer_safe(ocr_text: str) -> str:
    try:
        return generate_explainer(ocr_text)
    except Exception as exc:  # noqa: BLE001 - worker loop must not crash on one bad doc
        print(f"[worker] explainer generation failed (continuing): {exc}")
        return "Explainer unavailable."


def fetch_jobs_stub() -> list[ExtractionJob]:
    """Local-dev fallback when SQS isn't configured: returns no jobs. Swap
    `poll_loop` to call `fetch_jobs_sqs` once SQS_EXTRACTION_QUEUE_URL and AWS
    credentials are available.
    """
    return []


def fetch_jobs_sqs(sqs_client) -> list[ExtractionJob]:
    response = sqs_client.receive_message(
        QueueUrl=QUEUE_URL,
        MaxNumberOfMessages=5,
        WaitTimeSeconds=2,
    )
    jobs = []
    for message in response.get("Messages", []):
        body = json.loads(message["Body"])
        jobs.append(ExtractionJob.model_validate(body))
        sqs_client.delete_message(QueueUrl=QUEUE_URL, ReceiptHandle=message["ReceiptHandle"])
    return jobs


def poll_loop() -> None:
    use_sqs = bool(QUEUE_URL)
    sqs_client = get_sqs_client() if use_sqs else None

    print(f"[worker] starting extraction worker (sqs={'on' if use_sqs else 'stubbed off'})")
    while True:
        jobs = fetch_jobs_sqs(sqs_client) if use_sqs else fetch_jobs_stub()
        for job in jobs:
            process_job(job)
        time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    poll_loop()
