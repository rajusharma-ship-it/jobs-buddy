import type { NotificationConfig, ReviewNotification } from "./types.js";

export async function sendTelegramReview(
  config: NotificationConfig,
  items: ReviewNotification[]
): Promise<void> {
  if (!config.telegramBotToken || !config.telegramChatId || items.length === 0) return;

  const lines = items.map(
    (item, i) =>
      `${i + 1}. ${item.title} at ${item.company} (${item.score}%) — ${item.salaryEstimate}\n   ${item.dashboardUrl}`
  );

  const text = `${items.length} application${items.length > 1 ? "s" : ""} ready to review.\nReply 1, 2, or 3 to open each in the dashboard.\n\n${lines.join("\n\n")}`;

  await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: config.telegramChatId,
      text,
      disable_web_page_preview: false,
    }),
  });
}

export async function sendTelegramTest(config: NotificationConfig): Promise<boolean> {
  if (!config.telegramBotToken || !config.telegramChatId) return false;
  const res = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: config.telegramChatId,
      text: "✅ Jobs Buddy notification test successful!",
    }),
  });
  return res.ok;
}
