import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceLeaderboard } from "@/components/workspace/WorkspaceLeaderboard";

const followTraderMock = vi.fn();
const unfollowTraderMock = vi.fn();
const isFollowingMock = vi.fn(() => false);

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ profile: { id: "me", username: "me" } }),
}));

vi.mock("@/contexts/SocialTradingContext", () => ({
  useSocialTrading: () => ({
    followTrader: followTraderMock,
    unfollowTrader: unfollowTraderMock,
    isFollowing: isFollowingMock,
  }),
}));

vi.mock("@/integrations/api/client", () => ({
  api: { from: vi.fn() },
  isConfigured: () => true,
}));

vi.mock("@/components/ui/CountryFlag", () => ({
  default: ({ code }: { code: string }) => <span data-testid="flag">{code}</span>,
}));

describe("WorkspaceLeaderboard", () => {
  beforeEach(() => {
    followTraderMock.mockReset();
    unfollowTraderMock.mockReset();
    isFollowingMock.mockReset();
    isFollowingMock.mockReturnValue(false);
  });

  it("shows traders from the profiles fallback when the trades query returns no rows", async () => {
    render(<WorkspaceLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText("demo")).toBeInTheDocument();
    });
  });
});
