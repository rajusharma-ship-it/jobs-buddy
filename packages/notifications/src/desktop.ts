import notifier from "node-notifier";
import type { ReviewNotification } from "./types.js";

export function sendDesktopNotification(item: ReviewNotification): void {
  notifier.notify({
    title: "Ready to Apply",
    message: `${item.title} at ${item.company} — Expected ${item.salaryEstimate}`,
    open: item.dashboardUrl,
    wait: false,
  });
}
