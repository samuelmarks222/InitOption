export type KycStatus = "Pending" | "Verified" | "Rejected";

export type KycDocumentLike = {
  url?: string | null;
} | null | undefined;

export type KycDocumentsLike = {
  front?: KycDocumentLike;
  back?: KycDocumentLike;
} | null | undefined;

export const normalizeKycStatus = (value: unknown): KycStatus => {
  if (value === "Verified" || value === "Rejected") return value;
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
  return hasUploadedKycDocuments(documents) ? "Pending verification" : "Not verified";
};
