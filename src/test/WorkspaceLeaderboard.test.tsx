import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceLeaderboard } from "@/components/workspace/WorkspaceLeaderboard";
import { supabase } from "@/integrations/supabase/client";

const followTraderMock = vi.fn();
const unfollowTraderMock = vi.fn();
const isFollowingMock = vi.fn(() => false);

const profileRowsQuery = {
  select: vi.fn(() => profileRowsQuery),
  order: vi.fn(() => profileRowsQuery),
  limit: vi.fn(async () => ({ data: [{ id: "user-1", username: "demo", display_name: "Demo Trader", avatar_url: null, nationality: "Kenya", phone_country: "KE", total_profit: 2500, total_trades: 5, total_wins: 3 }], error: null })),
};

const tradesRowsQuery = {
  select: vi.fn(() => tradesRowsQuery),
  neq: vi.fn(() => tradesRowsQuery),
  order: vi.fn(() => tradesRowsQuery),
  limit: vi.fn(async () => ({ data: [], error: null })),
  gte: vi.fn(() => tradesRowsQuery),
};

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

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "trades") return tradesRowsQuery;
      if (table === "profiles") return profileRowsQuery;
      throw new Error(`Unexpected table ${table}`);
    }),
  },
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
    vi.mocked(supabase.from).mockClear();
  });

  it("shows traders from the profiles fallback when the trades query returns no rows", async () => {
    render(<WorkspaceLeaderboard />);

    await waitFor(() => {
      expect(screen.getByText("demo")).toBeInTheDocument();
    });
  });
});
