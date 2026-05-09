import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EmailVerificationPanel } from "@/components/profile/EmailVerificationPanel";

const authMock = {
  emailVerified: false,
  emailVerifiedAt: null as string | null,
  sendEmailVerificationCode: vi.fn(),
  user: { email: "trader@example.com" },
  verifyEmailCode: vi.fn(),
};

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authMock,
}));

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

describe("EmailVerificationPanel", () => {
  beforeEach(() => {
    authMock.emailVerified = false;
    authMock.emailVerifiedAt = null;
    authMock.sendEmailVerificationCode.mockReset();
    authMock.verifyEmailCode.mockReset();
  });

  it("shows the unverified state with a send-code action", () => {
    render(<EmailVerificationPanel />);

    expect(screen.getByText("Verify your email")).toBeInTheDocument();
    expect(screen.getByText("Unverified")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Verify email" })).toBeInTheDocument();
  });

  it("shows the verified state without the send-code action", () => {
    authMock.emailVerified = true;
    authMock.emailVerifiedAt = "2026-03-28T09:00:00.000Z";

    render(<EmailVerificationPanel />);

    expect(screen.getByText("Email verified")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Verify email" })).not.toBeInTheDocument();
  });
});
