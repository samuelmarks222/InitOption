import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/identityApi", () => ({
  identityRequest: mocks.request,
  viewIdentityDocument: vi.fn(),
}));
vi.mock("@/components/profile/AccountProfilePanel", () => ({
  identityButton: "",
  identityInput: "",
}));
import { IdentityReviewQueue } from "@/components/admin/IdentityReviewQueue";
const item = {
  user_id: "11111111-1111-4111-8111-111111111111",
  username: "trader.1",
  status: "Submitted",
  revision: 3,
  identity: {
    documentType: "passport",
    documentNumber: "A12345",
    details: { firstName: "Sam", lastName: "Marks" },
  },
  documents: [{ slot: "front" }],
};
beforeEach(() => {
  mocks.request.mockReset().mockResolvedValue({ cases: [item] });
});
afterEach(cleanup);
it("requires attestation and actionable feedback, then sends a revision-bound review", async () => {
  render(
    <MemoryRouter>
      <IdentityReviewQueue />
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole("button", { name: /trader.1/ }));
  const reject = screen.getByRole("button", { name: "Request changes" });
  expect(reject).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  expect(reject).toBeDisabled();
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Please replace the blurred photo page." },
  });
  expect(reject).not.toBeDisabled();
  fireEvent.click(reject);
  await waitFor(() =>
    expect(mocks.request).toHaveBeenCalledWith("review", {
      userId: item.user_id,
      revision: 3,
      decision: "Rejected",
      note: "Please replace the blurred photo page.",
      confirmed: true,
    }),
  );
});
it("does not offer decisions until a reviewer selects an actual submission", async () => {
  render(
    <MemoryRouter>
      <IdentityReviewQueue />
    </MemoryRouter>,
  );
  await screen.findByRole("button", { name: /trader.1/ });
  expect(
    screen.queryByRole("button", { name: "Approve identity" }),
  ).not.toBeInTheDocument();
});
it("shows authorization failures rather than a fabricated review queue", async () => {
  mocks.request.mockRejectedValue(
    new Error("You do not have permission to review identity documents."),
  );
  render(
    <MemoryRouter>
      <IdentityReviewQueue />
    </MemoryRouter>,
  );
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "You do not have permission",
  );
  expect(
    screen.queryByRole("button", { name: /trader.1/ }),
  ).not.toBeInTheDocument();
});
