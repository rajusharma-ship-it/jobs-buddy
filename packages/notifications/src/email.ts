import nodemailer from "nodemailer";
import type { NotificationConfig, DailySummary } from "./types.js";

export async function sendDailyEmailSummary(
  config: NotificationConfig,
  summary: DailySummary
): Promise<void> {
  if (!config.emailTo || !config.smtpHost || !config.smtpUser || !config.smtpPass) return;

  const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: 587,
    secure: false,
    auth: { user: config.smtpUser, pass: config.smtpPass },
  });

  const text = `Jobs Buddy — Daily Summary

Total processed: ${summary.totalProcessed}
Submitted: ${summary.submitted}
Skipped: ${summary.skipped}
Waiting for review: ${summary.waiting}
`;

  await transporter.sendMail({
    from: config.smtpUser,
    to: config.emailTo,
    subject: `Jobs Buddy Daily Summary — ${new Date().toLocaleDateString()}`,
    text,
  });
}

export async function sendEmailTest(config: NotificationConfig): Promise<boolean> {
  if (!config.emailTo || !config.smtpHost || !config.smtpUser || !config.smtpPass) return false;
  try {
    const transporter = nodemailer.createTransport({
      host: config.smtpHost,
      port: 587,
      secure: false,
      auth: { user: config.smtpUser, pass: config.smtpPass },
    });
    await transporter.sendMail({
      from: config.smtpUser,
      to: config.emailTo,
      subject: "Jobs Buddy Test",
      text: "✅ Jobs Buddy email notification test successful!",
    });
    return true;
  } catch {
    return false;
  }
}
