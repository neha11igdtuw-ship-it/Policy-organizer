// Producer side of the API <-> Python extraction worker handoff.
//
// TODO(real-aws): Swap the stub body for a real @aws-sdk/client-sqs SendMessage
// call against process.env.SQS_EXTRACTION_QUEUE_URL. The worker
// (workers/extraction/main.py) is written against this same job shape, so the
// contract (ExtractionJob) must stay in sync with its `schema.py`.

import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

const sqsClient = new SQSClient({ region: process.env.AWS_REGION ?? "us-east-1" });
const QUEUE_URL = process.env.SQS_EXTRACTION_QUEUE_URL;

export interface ExtractionJob {
  policyId: string;
  s3Key: string;
  documentType: "LIFE" | "ANNUITY" | "HEALTH";
}

export async function enqueueExtractionJob(job: ExtractionJob): Promise<void> {
  if (!QUEUE_URL) {
    // TODO(real-aws): remove this guard once SQS_EXTRACTION_QUEUE_URL is set
    // in every environment; for local dev we just log instead of throwing so
    // the rest of the upload flow can still be exercised.
    console.warn("[extraction service] SQS_EXTRACTION_QUEUE_URL not set; skipping enqueue", job);
    return;
  }

  await sqsClient.send(
    new SendMessageCommand({
      QueueUrl: QUEUE_URL,
      MessageBody: JSON.stringify(job),
    })
  );
}
