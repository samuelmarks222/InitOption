export type KycStatus = "Pending" | "Verified" | "Rejected";

export type KycDocumentLike = {
  url?: string | null;
} | null | undefined;

export type KycDocumentsLike = {
  front?: KycDocumentLike;
  back?: KycDocumentLike;
} | null | undefined;

export const normalizeKycStatus = (value: unknown): KycStatus => {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (normalized === "verified" || normalized === "approved") return "Verified";
  if (normalized === "rejected") return "Rejected";
  return "Pending";
};

export const hasUploadedKycDocuments = (documents: KycDocumentsLike) =>
  Boolean(documents?.front?.url || documents?.back?.url);

export const hasCompleteKycDocuments = (documents: KycDocumentsLike) =>
  Boolean(documents?.front?.url && documents?.back?.url);

export const getProfileKycLabel = (statusValue: unknown, documents: KycDocumentsLike) => {
  const status = normalizeKycStatus(statusValue);

  if (status === "Verified") return "Verified";
  if (status === "Rejected") return "Rejected";
  return hasUploadedKycDocuments(documents) ? "Submitted" : "Not verified";
};
