import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TournamentDetailOverlay } from "@/components/workspace/TournamentDetailOverlay";
import { supabase } from "@/integrations/supabase/client";

const updateProfileMock = vi.fn();

const tournamentRecord = {
  id: "tour-1",
  title: "Mock Tournament",
  description: "Test arena for regression coverage.",
  entry_fee: 0,
  rebuy_cost: 10,
  prize_pool: 5000,
  starting_balance: 1000,
  start_date: "2026-03-25T10:00:00.000Z",
  end_date: "2026-03-26T10:00:00.000Z",
  status: "active",
  created_at: "2026-03-20T10:00:00.000Z",
  updated_at: "2026-03-20T10:00:00.000Z",
};

const participantRecord = {
  id: "participant-1",
  tournament_id: "tour-1",
  user_id: "user-1",
  current_balance: 1200,
  created_at: "2026-03-25T10:05:00.000Z",
  updated_at: "2026-03-25T10:05:00.000Z",
  profiles: { username: "sam" },
};

const tournamentsQuery = {
  select: vi.fn(() => tournamentsQuery),
  eq: vi.fn(() => tournamentsQuery),
  single: vi.fn(async () => ({ data: tournamentRecord, error: null })),
};

const participantsQuery = {
  select: vi.fn(() => participantsQuery),
  eq: vi.fn(() => participantsQuery),
  order: vi.fn(async () => ({ data: [participantRecord], error: null })),
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    profile: {
      id: "user-1",
      username: "sam",
      balance: 250,
    },
    updateProfile: updateProfileMock,
  }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "tournaments") return tournamentsQuery;
      if (table === "tournament_participants") return participantsQuery;

      throw new Error(`Unexpected table: ${table}`);
    }),
    rpc: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe("TournamentDetailOverlay", () => {
  beforeEach(() => {
    updateProfileMock.mockReset();
    vi.mocked(supabase.rpc).mockReset();
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [] } as any);
    tournamentsQuery.select.mockClear();
    tournamentsQuery.eq.mockClear();
    tournamentsQuery.single.mockClear();
    participantsQuery.select.mockClear();
    participantsQuery.eq.mockClear();
    participantsQuery.order.mockClear();
  });

  it("shows registered participants on the leaderboard when the rpc returns no rows", async () => {
    render(<TournamentDetailOverlay tournamentId="tour-1" onClose={() => {}} onEnterTournament={() => {}} />);

    expect(await screen.findByText("You")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByText("No participants yet.")).not.toBeInTheDocument();
    });
  });

  it("opens from a null tournament selection without triggering a hooks-order crash", async () => {
    const { rerender } = render(
      <TournamentDetailOverlay tournamentId={null} onClose={() => {}} onEnterTournament={() => {}} />,
    );

    expect(screen.queryByText("Competition details")).not.toBeInTheDocument();

    rerender(
      <TournamentDetailOverlay tournamentId="tour-1" onClose={() => {}} onEnterTournament={() => {}} />,
    );

    expect(await screen.findByRole("heading", { name: /Mock Tournament/i })).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Leaderboard")).toBeInTheDocument();
    });

    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open tournament desk" })).toBeInTheDocument();
    expect(tournamentsQuery.single).toHaveBeenCalledTimes(1);
    expect(participantsQuery.order).toHaveBeenCalledTimes(1);
  });
});
