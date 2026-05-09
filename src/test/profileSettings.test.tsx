import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/profileSettings";
import { ProfileSettings } from "@/components/profile/ProfileSettings";

const updateProfileMock = vi.fn();
const toastMock = vi.fn();
let profileMock: {
  notificationPreferences?: typeof DEFAULT_NOTIFICATION_PREFERENCES;
} = {};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    emailVerified: false,
    emailVerifiedAt: null,
    profile: profileMock,
    sendEmailVerificationCode: vi.fn(),
    updateProfile: updateProfileMock,
    user: { email: "user@example.com" },
    verifyEmailCode: vi.fn(),
  }),
}));

vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => ({
    currency: "USD",
    currencyOption: { label: "US Dollar" },
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: (...args: unknown[]) => toastMock(...args),
}));

vi.mock("@/components/profile/AccountCurrencyModal", () => ({
  AccountCurrencyModal: () => null,
}));

vi.mock("@/components/social/CopyTradingSettingsPanel", () => ({
  CopyTradingSettingsPanel: () => <div>Copy trading settings</div>,
}));

vi.mock("@/components/profile/EmailVerificationPanel", () => ({
  EmailVerificationPanel: () => <div>Email verification panel</div>,
}));

describe("ProfileSettings", () => {
  beforeEach(() => {
    profileMock = {
      notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
    };
    updateProfileMock.mockReset();
    updateProfileMock.mockResolvedValue(undefined);
    toastMock.mockReset();
  });

  it("persists notification preference changes from the profile drawer settings", async () => {
    render(<ProfileSettings />);

    fireEvent.click(screen.getByRole("button", { name: "Notifications" }));

    const depositsToggle = screen.getByRole("button", { name: "Toggle Deposits & Withdrawals" });
    expect(depositsToggle).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(depositsToggle);

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledWith({
        notificationPreferences: {
          ...DEFAULT_NOTIFICATION_PREFERENCES,
          emailDepositsWithdrawals: false,
        },
      });
    });

    await waitFor(() => {
      expect(depositsToggle).toHaveAttribute("aria-pressed", "false");
    });

    expect(toastMock).not.toHaveBeenCalled();
  });
});
