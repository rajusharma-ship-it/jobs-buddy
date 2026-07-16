import type { NotificationConfig, ReviewNotification } from "./types.js";

export async function sendSlackReview(
  config: NotificationConfig,
  item: ReviewNotification
): Promise<void> {
  if (!config.slackWebhookUrl) return;

  await fetch(config.slackWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "Ready to Apply" },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Company:*\n${item.company}` },
            { type: "mrkdwn", text: `*Position:*\n${item.title}` },
            { type: "mrkdwn", text: `*Match Score:*\n${item.score}%` },
            { type: "mrkdwn", text: `*Salary Est.:*\n${item.salaryEstimate}` },
          ],
        },
        {
          type: "actions",
          elements: [
            {
              type: "button",
              text: { type: "plain_text", text: "Review Application" },
              url: item.dashboardUrl,
            },
          ],
        },
      ],
    }),
  });
}
