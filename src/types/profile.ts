import type { Tables } from "@/integrations/supabase/types";
import type { KycDocumentsLike } from "@/lib/kyc";

export interface NotificationPreferences {
  emailDepositsWithdrawals: boolean;
  emailTradeExecution: boolean;
  emailPromotionsBonuses: boolean;
  emailTournaments: boolean;
  emailSecurityKyc: boolean;
  pushPriceAlerts: boolean;
  pushMarginCalls: boolean;
}

export type ProfileMetadataFields = {
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  nationality?: string | null;
  phoneCountry?: string | null;
  phoneCountryCode?: string | null;
  address?: string | null;
  dob?: string | null;
  idType?: string | null;
  idNumber?: string | null;
  kycDocuments?: KycDocumentsLike;
  kycStatus?: string | null;
  notificationPreferences?: NotificationPreferences | null;
};

export type AuthProfile = Tables<"profiles"> & ProfileMetadataFields;
export type ProfileUpdateInput = Partial<AuthProfile>;
