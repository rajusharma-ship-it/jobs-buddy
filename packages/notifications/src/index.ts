import type { NotificationConfig, ReviewNotification, DailySummary } from "./types.js";
import { sendTelegramReview } from "./telegram.js";
import { sendDiscordReview } from "./discord.js";
import { sendSlackReview } from "./slack.js";
import { sendDesktopNotification } from "./desktop.js";

export async function notifyReviewReady(
  config: NotificationConfig,
  items: ReviewNotification[]
): Promise<void> {
  await Promise.allSettled([
    sendTelegramReview(config, items),
    ...items.map((item) => sendDiscordReview(config, item)),
    ...items.map((item) => sendSlackReview(config, item)),
    ...items.map((item) => Promise.resolve(sendDesktopNotification(item))),
  ]);
}

export async function notifySingleReview(
  config: NotificationConfig,
  item: ReviewNotification
): Promise<void> {
  await notifyReviewReady(config, [item]);
}

export { loadNotificationConfig } from "./types.js";
export { sendTelegramTest } from "./telegram.js";
export { sendDiscordTest } from "./discord.js";
export { sendEmailTest, sendDailyEmailSummary } from "./email.js";
export type { NotificationConfig, ReviewNotification, DailySummary };
