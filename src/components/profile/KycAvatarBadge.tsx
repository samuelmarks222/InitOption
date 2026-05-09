import { Check, Clock3, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasUploadedKycDocuments, normalizeKycStatus, type KycDocumentsLike, type KycStatus } from "@/lib/kyc";

type KycAvatarBadgeProps = {
  status?: KycStatus | null;
  documents?: KycDocumentsLike;
  size?: "sm" | "md";
  className?: string;
};

const SIZE_STYLES = {
  sm: {
    wrapper: "h-4 w-4 border-[1.5px]",
    icon: "h-2.5 w-2.5",
  },
  md: {
    wrapper: "h-[18px] min-w-[18px] border-[2px]",
    icon: "h-3 w-3",
  },
};

export const KycAvatarBadge = ({
  status = "Pending",
  documents,
  size = "md",
  className,
}: KycAvatarBadgeProps) => {
  const normalizedStatus = normalizeKycStatus(status);
  const showPending = normalizedStatus === "Pending" && hasUploadedKycDocuments(documents);

  if (normalizedStatus === "Pending" && !showPending) {
    return null;
  }

  const sizeStyles = SIZE_STYLES[size];
  const visual =
    normalizedStatus === "Verified"
      ? {
          wrapper: "bg-[#1877F2] text-white shadow-[0_0_0_1px_rgba(255,255,255,0.16),0_8px_18px_rgba(24,119,242,0.38)]",
          icon: Check,
        }
      : normalizedStatus === "Rejected"
        ? {
            wrapper: "bg-red-500 text-white",
            icon: X,
          }
        : {
            wrapper: "bg-[#0fa053] text-white",
            icon: Clock3,
          };

  const Icon = visual.icon;

  return (
    <div
      className={cn(
        "absolute -bottom-1 -right-1 flex items-center justify-center rounded-full border border-[#1b2230] shadow-[0_4px_12px_rgba(0,0,0,0.35)]",
        sizeStyles.wrapper,
        visual.wrapper,
        className,
      )}
      title={normalizedStatus === "Verified" ? "Verified profile" : normalizedStatus === "Rejected" ? "Verification rejected" : "Pending verification"}
    >
      <Icon className={sizeStyles.icon} strokeWidth={3} />
    </div>
  );
};


