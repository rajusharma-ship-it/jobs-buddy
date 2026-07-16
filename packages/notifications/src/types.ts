export interface ReviewNotification {
  id: string;
  company: string;
  title: string;
  score: number;
  salaryEstimate: string;
  dashboardUrl: string;
}

export interface DailySummary {
  totalProcessed: number;
  submitted: number;
  skipped: number;
  waiting: number;
}

export interface NotificationConfig {
  telegramBotToken?: string;
  telegramChatId?: string;
  discordWebhookUrl?: string;
  slackWebhookUrl?: string;
  emailTo?: string;
  smtpHost?: string;
  smtpUser?: string;
  smtpPass?: string;
  dashboardBaseUrl?: string;
}

export function loadNotificationConfig(): NotificationConfig {
  return {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN,
    telegramChatId: process.env.TELEGRAM_CHAT_ID,
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL,
    slackWebhookUrl: process.env.SLACK_WEBHOOK_URL,
    emailTo: process.env.NOTIFICATION_EMAIL_TO,
    smtpHost: process.env.SMTP_HOST,
    smtpUser: process.env.SMTP_USER,
    smtpPass: process.env.SMTP_PASS,
    dashboardBaseUrl: process.env.DASHBOARD_URL ?? "http://127.0.0.1:3000",
  };
}
