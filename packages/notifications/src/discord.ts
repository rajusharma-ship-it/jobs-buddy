import type { NotificationConfig, ReviewNotification } from "./types.js";

export async function sendDiscordReview(
  config: NotificationConfig,
  item: ReviewNotification
): Promise<void> {
  if (!config.discordWebhookUrl) return;

  await fetch(config.discordWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [
        {
          title: "Ready to Apply",
          color: 0x2563eb,
          fields: [
            { name: "Company", value: item.company, inline: true },
            { name: "Position", value: item.title, inline: true },
            { name: "Match Score", value: `${item.score}%`, inline: true },
            { name: "Salary Est.", value: item.salaryEstimate, inline: true },
          ],
          url: item.dashboardUrl,
        },
      ],
    }),
  });
}

export async function sendDiscordTest(config: NotificationConfig): Promise<boolean> {
  if (!config.discordWebhookUrl) return false;
  const res = await fetch(config.discordWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "✅ Jobs Buddy Discord notification test successful!" }),
  });
  return res.ok;
}
