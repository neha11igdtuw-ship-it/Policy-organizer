// SES email sending for reminders (renewal/premium/surrender windows) and
// family-share invites.
//
// TODO(real-aws): Swap the stub body for a real @aws-sdk/client-ses
// SendEmailCommand call. Source address must be verified in SES
// (process.env.SES_FROM_ADDRESS).

import { SendEmailCommand, SESClient } from "@aws-sdk/client-ses";

const sesClient = new SESClient({ region: process.env.SES_REGION ?? "us-east-1" });
const FROM_ADDRESS = process.env.SES_FROM_ADDRESS ?? "notifications@example.com";

export interface ReminderEmail {
  toEmail: string;
  subject: string;
  bodyText: string;
}

export async function sendReminderEmail(email: ReminderEmail): Promise<void> {
  // TODO(real-aws): remove this dev-mode short-circuit once SES is verified
  // in the target environment.
  if (process.env.NODE_ENV !== "production") {
    console.log(`[reminders stub] would send email to ${email.toEmail}: ${email.subject}`);
    return;
  }

  await sesClient.send(
    new SendEmailCommand({
      Source: FROM_ADDRESS,
      Destination: { ToAddresses: [email.toEmail] },
      Message: {
        Subject: { Data: email.subject },
        Body: { Text: { Data: email.bodyText } },
      },
    })
  );
}
