import type { Tables } from "@/integrations/supabase/types";
import type { KycDocumentsLike } from "@/lib/kyc";

export type ProfileMetadataFields = {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  nationality?: string | null;
  address?: string | null;
  dob?: string | null;
  idType?: string | null;
  idNumber?: string | null;
  kycDocuments?: KycDocumentsLike;
  kycStatus?: string | null;
};

export type AuthProfile = Tables<"profiles"> & ProfileMetadataFields;
export type ProfileUpdateInput = Partial<AuthProfile>;
