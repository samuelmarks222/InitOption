import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  upload: vi.fn(),
  refresh: vi.fn(),
}));
vi.mock("@/lib/identityApi", () => ({
  identityRequest: mocks.request,
  uploadIdentityDocument: mocks.upload,
  viewIdentityDocument: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    profile: { username: "trader.1" },
    user: { id: "owner", email: "owner@example.com" },
    refreshProfile: mocks.refresh,
  }),
}));
vi.mock("@/contexts/CurrencyContext", () => ({
  useCurrency: () => ({ currency: "USD" }),
}));
vi.mock("@/components/profile/EmailVerificationPanel", () => ({
  EmailVerificationPanel: () => null,
}));
vi.mock("@/components/profile/ProfileUploadPhoto", () => ({
  ProfileUploadPhoto: () => null,
}));
vi.mock("@/components/profile/ProfileSettings", () => ({
  ProfileSettings: () => null,
}));
vi.mock("@/components/profile/AccountCurrencyModal", () => ({
  AccountCurrencyModal: () => null,
}));
import { AccountProfilePanel } from "@/components/profile/AccountProfilePanel";
const details = {
  username: "trader.1",
  firstName: "Sam",
  lastName: "Marks",
  dob: "1995-01-01",
  country: "Kenya",
  phone: "+254712345678",
  address: "Main Street, Nairobi",
};
const state = (status = "Draft", documents: any[] = []) => ({
  details,
  verification: {
    status,
    revision: 1,
    documentType: "national_id",
    documentNumber: "12345678",
    reviewNote: null,
    documents,
  },
});
afterEach(cleanup);
beforeEach(() => {
  mocks.request.mockReset().mockResolvedValue(state());
  mocks.upload.mockReset();
  mocks.refresh.mockReset().mockResolvedValue(undefined);
});
async function show() {
  render(<AccountProfilePanel />);
  await screen.findByLabelText("Legal first name *");
}
describe("profile and explicit identity submission UI", () => {
  it("loads persisted details and saves through the server, not browser storage", async () => {
    await show();
    fireEvent.change(screen.getByLabelText("Phone number *"), {
      target: { value: "+254700000000" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Save personal details/ }),
    );
    await waitFor(() =>
      expect(mocks.request).toHaveBeenCalledWith("profile", {
        details: { ...details, phone: "+254700000000" },
      }),
    );
  });
  it("keeps user edits and displays actionable server save errors", async () => {
    await show();
    mocks.request.mockRejectedValueOnce(
      new Error("Account service unavailable"),
    );
    fireEvent.change(screen.getByLabelText("Legal first name *"), {
      target: { value: "Samuel" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Save personal details/ }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Account service unavailable",
    );
    expect(screen.getByLabelText("Legal first name *")).toHaveValue("Samuel");
  });
  it("requires both required sides and consent before explicit submission", async () => {
    mocks.request.mockResolvedValue(
      state("Draft", [
        { slot: "front", documentType: "national_id", name: "front.jpg" },
        { slot: "back", documentType: "national_id", name: "back.jpg" },
      ]),
    );
    await show();
    fireEvent.click(
      screen.getByRole("button", { name: "Identity verification" }),
    );
    const submit = screen.getByRole("button", { name: "Submit for review" });
    expect(submit).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox"));
    expect(submit).not.toBeDisabled();
    fireEvent.click(submit);
    await waitFor(() =>
      expect(mocks.request).toHaveBeenCalledWith("submit", {
        documentType: "national_id",
        documentNumber: "12345678",
        consent: true,
      }),
    );
  });
  it("does not label a single upload as submitted or verified", async () => {
    await show();
    fireEvent.click(
      screen.getByRole("button", { name: "Identity verification" }),
    );
    mocks.upload.mockResolvedValue(
      state("Draft", [
        { slot: "front", documentType: "national_id", name: "front.jpg" },
      ]),
    );
    fireEvent.change(screen.getByLabelText("Upload front document"), {
      target: {
        files: [new File(["image"], "front.jpg", { type: "image/jpeg" })],
      },
    });
    await waitFor(() => expect(mocks.upload).toHaveBeenCalled());
    expect(
      mocks.request.mock.calls.some(([action]) => action === "submit"),
    ).toBe(false);
    expect(
      screen.getByRole("button", { name: "Submit for review" }),
    ).toBeDisabled();
  });
  it("locks legal fields and images while under review", async () => {
    mocks.request.mockResolvedValue(state("Submitted"));
    await show();
    expect(screen.getByLabelText("Legal first name *")).toBeDisabled();
    expect(screen.getByLabelText("Phone number *")).not.toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Identity verification" }),
    );
    expect(screen.getByLabelText("Upload front document")).toBeDisabled();
    expect(
      screen.queryByRole("button", { name: "Submit for review" }),
    ).not.toBeInTheDocument();
  });
  it("shows reviewer feedback and allows correction after rejection", async () => {
    mocks.request.mockResolvedValue({
      ...state("Rejected"),
      verification: {
        ...state("Rejected").verification,
        reviewNote: "Please replace the blurry back image.",
      },
    });
    await show();
    fireEvent.click(
      screen.getByRole("button", { name: "Identity verification" }),
    );
    expect(
      screen.getByText("Please replace the blurry back image."),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Upload back document")).not.toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Resubmit for review" }),
    ).toBeDisabled();
  });
  it("prevents submitting with unsaved personal detail changes", async () => {
    mocks.request.mockResolvedValue(
      state("Draft", [
        { slot: "front", documentType: "national_id", name: "front.jpg" },
        { slot: "back", documentType: "national_id", name: "back.jpg" },
      ]),
    );
    await show();
    fireEvent.change(screen.getByLabelText("Legal first name *"), {
      target: { value: "Samuel" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Identity verification" }),
    );
    fireEvent.click(screen.getByRole("checkbox"));
    expect(
      screen.getByRole("button", { name: "Submit for review" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Save your personal details first" }),
    ).toBeInTheDocument();
  });
});
