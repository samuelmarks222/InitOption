import { supabase } from "@/integrations/supabase/client";

export type AdminKycDecision = "Pending" | "Verified" | "Rejected";

export type AdminKycDocument = {
  name: string;
  url: string;
  mimeType: string;
  uploadedAt: string;
};

export type AdminKycDocuments = {
  front?: AdminKycDocument | null;
  back?: AdminKycDocument | null;
};

export type AdminUserManagementFeedItem = {
  balance: number;
  currentTier: string;
  id: string;
  kycDocuments: AdminKycDocuments;
  kycStatus: AdminKycDecision;
  manualOverride: string | null;
  name: string;
  registrationDate: string;
  totalDeposit: number;
  totalProfit: number;
  totalTrades: number;
  totalWins: number;
  trades30d: number;
  username: string;
  volume30d: number;
};

interface ReviewUserKycArgs {
  adminNote?: string | null;
  status: AdminKycDecision;
  userId: string;
}

interface ReviewUserKycResponse {
  status: AdminKycDecision;
  user_id: string;
}

const getAccessToken = async () => {
  const sessionResponse = await supabase.auth.getSession();
  const accessToken = sessionResponse.data.session?.access_token;

  if (!accessToken) {
    throw new Error("Authentication required. Please sign in again.");
  }

  return accessToken;
};

const postAuthenticatedJson = async <T>(path: string, body: Record<string, unknown>) => {
  const accessToken = await getAccessToken();

  const response = await fetch(path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  let payload: { error?: string } & Partial<T> = {};

  try {
    payload = (await response.json()) as { error?: string } & Partial<T>;
  } catch {
    payload = {};
  }

  if (!response.ok) {
    throw new Error(payload.error || "The KYC review request could not be completed.");
  }

  return payload as T;
};

export const reviewUserKyc = async ({
  adminNote = null,
  status,
  userId,
}: ReviewUserKycArgs): Promise<ReviewUserKycResponse> =>
  postAuthenticatedJson<ReviewUserKycResponse>("/api/system/admin-review-kyc", {
    adminNote,
    status,
    userId,
  });

export const fetchAdminUserManagementFeed = async () => {
  const payload = await postAuthenticatedJson<{ users: AdminUserManagementFeedItem[] }>(
    "/api/system/admin-users",
    {},
  );

  return payload.users;
};
