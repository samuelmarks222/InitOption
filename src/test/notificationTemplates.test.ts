import { describe, expect, it } from "vitest";
import { getNotificationTemplate, type NotificationRenderable } from "@/lib/notifications";

const buildNotification = (overrides: Partial<NotificationRenderable>): NotificationRenderable => ({
  id: "note_1",
  type: "announcement",
  title: "Platform update",
  message: "Something changed.",
  link_url: "/notifications",
  data: {},
  is_read: false,
  created_at: "2026-03-28T09:00:00.000Z",
  ...overrides,
});

describe("getNotificationTemplate", () => {
  it("renders finance events with the finance variant", () => {
    const template = getNotificationTemplate(
      buildNotification({
        type: "withdrawal_requested",
        title: "Withdrawal request received",
        message: "Your withdrawal request for $120.00 was submitted.",
        link_url: "/withdraw",
        data: { amount: 120 },
      }),
    );

    expect(template.variant).toBe("finance");
    expect(template.heroAccent).toBe("WITHDRAW");
    expect(template.heroMetric).toBe("$120");
  });

  it("renders tournament prize updates with the tournament variant", () => {
    const template = getNotificationTemplate(
      buildNotification({
        type: "tournament_prize",
        title: "Tournament prize awarded",
        message: "You finished #1 in Weekend Alpha Cup and won $500.",
        data: { amount: 500, tournament_title: "Weekend Alpha Cup" },
      }),
    );

    expect(template.variant).toBe("tournament");
    expect(template.heroAccent).toBe("WIN");
    expect(template.heroLabel).toBe("Weekend Alpha Cup");
  });

  it("renders KYC decisions with the security variant", () => {
    const template = getNotificationTemplate(
      buildNotification({
        type: "kyc_approved",
        title: "KYC approved",
        message: "Your verification has been approved.",
      }),
    );

    expect(template.variant).toBe("security");
    expect(template.heroAccent).toBe("APPROVED");
  });
});
