import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceLeaderboard } from "@/components/workspace/WorkspaceLeaderboard";

const followTraderMock = vi.fn();
const unfollowTraderMock = vi.fn();
const isFollowingMock = vi.fn(() => false);
const saveCopySettingMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ profile: { id: "me", username: "me" } }),
}));

vi.mock("@/contexts/SocialTradingContext", () => ({
  useSocialTrading: () => ({
    followTrader: followTraderMock,
    unfollowTrader: unfollowTraderMock,
    isFollowing: isFollowingMock,
    saveCopySetting: saveCopySettingMock,
  }),
}));

vi.mock("@/integrations/api/client", () => ({
  api: { from: (...args: unknown[]) => fromMock(...args) },
  isConfigured: () => true,
}));

vi.mock("@/components/ui/CountryFlag", () => ({
  default: ({ code }: { code: string }) => <span data-testid="flag">{code}</span>,
}));

describe("WorkspaceLeaderboard", () => {
  beforeEach(() => {
    followTraderMock.mockReset();
    unfollowTraderMock.mockReset();
    saveCopySettingMock.mockReset();
    isFollowingMock.mockReset();
    isFollowingMock.mockReturnValue(false);
    fromMock.mockImplementation((table: string) => {
      if (table === "trades") {
        return {
          select: () => ({
            neq: () => ({
              gte: () => ({
                order: () => ({
                  limit: async () => ({ data: [], error: null }),
                }),
              }),
            }),
          }),
        };
      }

      return {
        select: () => ({
          order: () => ({
            limit: async () => ({
              data: [{
                id: "demo",
                username: "demo",
                display_name: null,
                avatar_url: null,
                nationality: "Kenya",
                phone_country: "KE",
                total_profit: 12.5,
                total_trades: 3,
                total_wins: 2,
                followers_count: 1,
                created_at: "2026-01-01T00:00:00Z",
                vip_tier: null,
              }],
              error: null,
            }),
          }),
        }),
      };
    });
  });

  it("shows traders from the profiles fallback when the trades query returns no rows", async () => {
    render(<WorkspaceLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText("demo")).toBeInTheDocument();
    });
  });
});
