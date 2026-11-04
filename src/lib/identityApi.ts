import { getAppwriteIdToken } from "@/integrations/appwrite/authService";
import type { AccountDetails, IdentityStatus } from "./identityValidation";
export interface IdentityDocument {
  slot: "front" | "back";
  name: string;
  documentType: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}
export interface IdentityState {
  details: AccountDetails | null;
  verification: {
    status: IdentityStatus;
    revision: number;
    documentType: string;
    documentNumber: string;
    submittedAt: string | null;
    reviewedAt: string | null;
    reviewNote: string | null;
    documents: IdentityDocument[];
  };
}
export interface IdentityCase {
  user_id: string;
  username: string;
  status: IdentityStatus;
  revision: number;
  identity: {
    documentType: string;
    documentNumber: string;
    details: AccountDetails;
  };
  submitted_at: string;
  reviewed_at: string | null;
  review_note: string | null;
  documents: IdentityDocument[] | null;
}
async function send(
  action: string,
  body?: unknown,
  params: Record<string, string> = {},
) {
  const url = `/api/system?${new URLSearchParams({ route: "identity", action, ...params })}`;
  const request = async (refresh: boolean) => {
    const token = await getAppwriteIdToken(refresh);
    if (!token) throw new Error("Please sign in again.");
    return fetch(url, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
  };
  let response = await request(false);
  if (response.status === 401) response = await request(true);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(
      payload.error || "Unable to complete this request. Please try again.",
    );
  }
  return response;
}
export const identityRequest = async <T = IdentityState>(
  action: string,
  body?: unknown,
) => (await send(action, body)).json() as Promise<T>;
export async function viewIdentityDocument(slot: string, userId?: string) {
  const response = await send("document", undefined, {
    slot,
    ...(userId ? { userId } : {}),
  });
  return URL.createObjectURL(await response.blob());
}
export async function uploadIdentityDocument(
  slot: "front" | "back",
  file: File,
  documentType: string,
) {
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.onerror = () =>
      reject(new Error("Could not read this file. Choose it again."));
    reader.readAsDataURL(file);
  });
  return identityRequest("upload", {
    slot,
    name: file.name,
    documentType,
    mimeType: file.type,
    data,
  });
}
