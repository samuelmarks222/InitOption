import { createRef, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Camera, CheckCircle2, FileText, ShieldCheck, Trash2, UploadCloud, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { KycAvatarBadge } from "./KycAvatarBadge";
import {
  COUNTRY_OPTIONS,
  PHONE_COUNTRY_OPTIONS,
  formatPhoneNumber,
  getCountryOptionByCode,
  getCountryOptionByDialCode,
  getCountryOptionByName,
  splitStoredPhoneNumber,
} from "@/lib/countries";
import { getProfileKycLabel, hasCompleteKycDocuments, hasUploadedKycDocuments, normalizeKycStatus } from "@/lib/kyc";
import { AccountCurrencyModal } from "./AccountCurrencyModal";
import { EmailVerificationPanel } from "./EmailVerificationPanel";

type GuideField =
  | "username"
  | "firstName"
  | "lastName"
  | "dob"
  | "nationality"
  | "phone"
  | "address"
  | "idType"
  | "idNumber"
  | "frontDocument"
  | "backDocument";

type GuideTarget = {
  field: GuideField;
  label: string;
} | null;

type KycDocument = {
  name: string;
  url: string;
  mimeType: string;
  uploadedAt: string;
  path?: string;
  fallback?: boolean;
};

type KycDocuments = {
  front?: KycDocument | null;
  back?: KycDocument | null;
};

interface ProfilePersonalDataProps {
  compact?: boolean;
  guidedTarget?: GuideTarget;
}

const ID_OPTIONS = ["Passport", "Driver's License", "National ID"];

const getPhoneStateFromProfile = (profileData: any) => {
  const parsedPhone = splitStoredPhoneNumber(profileData?.phone);
  const phoneCountry =
    getCountryOptionByCode(profileData?.phoneCountry) ??
    getCountryOptionByCode(profileData?.phone_country) ??
    (parsedPhone.countryCode ? getCountryOptionByCode(parsedPhone.countryCode) : null) ??
    getCountryOptionByDialCode(profileData?.phoneCountryCode ?? profileData?.phone_country_code) ??
    getCountryOptionByName(profileData?.nationality);

  return {
    localNumber: parsedPhone.localNumber || (parsedPhone.dialCode ? "" : String(profileData?.phone || "").trim()),
    phoneCountryCode: phoneCountry?.code ?? "",
  };
};

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });

export const ProfilePersonalData = ({ compact = false, guidedTarget = null }: ProfilePersonalDataProps) => {
  const { emailVerified, profile, updateProfile, user } = useAuth();
  const { currency, formatMoney } = useCurrency();
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const p = profile as any;
  const initialPhoneState = getPhoneStateFromProfile(p);
  const initialDocuments = ((p?.kyc_documents ?? p?.kycDocuments) ?? {}) as KycDocuments;

  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState<"front" | "back" | null>(null);
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [formData, setFormData] = useState({
    username: p?.username || "",
    firstName: p?.firstName || "",
    lastName: p?.lastName || "",
    dob: p?.dob || "",
    nationality: p?.nationality || "",
    phone: initialPhoneState.localNumber,
    address: p?.address || "",
    idType: p?.idType || "",
    idNumber: p?.idNumber || "",
  });
  const [phoneCountryCode, setPhoneCountryCode] = useState(initialPhoneState.phoneCountryCode);
  const [documents, setDocuments] = useState<KycDocuments>(initialDocuments);
  const [kycStatus, setKycStatus] = useState<"Pending" | "Verified" | "Rejected">(normalizeKycStatus(p?.kyc_status ?? p?.kycStatus));

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const lastExternalGuideKeyRef = useRef<string | null>(null);
  const fieldRefs = useMemo(
    () => ({
      username: createRef<HTMLInputElement>(),
      firstName: createRef<HTMLInputElement>(),
      lastName: createRef<HTMLInputElement>(),
      dob: createRef<HTMLInputElement>(),
      nationality: createRef<HTMLSelectElement>(),
      phone: createRef<HTMLInputElement>(),
      address: createRef<HTMLTextAreaElement>(),
      idType: createRef<HTMLSelectElement>(),
      idNumber: createRef<HTMLInputElement>(),
      frontDocument: createRef<HTMLButtonElement>(),
      backDocument: createRef<HTMLButtonElement>(),
    }),
    [],
  );

  useEffect(() => {
    const nextPhoneState = getPhoneStateFromProfile(p);

    setFormData({
      username: p?.username || "",
      firstName: p?.firstName || "",
      lastName: p?.lastName || "",
      dob: p?.dob || "",
      nationality: p?.nationality || "",
      phone: nextPhoneState.localNumber,
      address: p?.address || "",
      idType: p?.idType || "",
      idNumber: p?.idNumber || "",
    });
    setPhoneCountryCode(nextPhoneState.phoneCountryCode);
    setDocuments(((p?.kyc_documents ?? p?.kycDocuments) ?? {}) as KycDocuments);
    setKycStatus(normalizeKycStatus(p?.kyc_status ?? p?.kycStatus));
  }, [profile]);

  useEffect(() => {
    if (!guidedTarget) return;

    const guideKey = `${guidedTarget.field}:${guidedTarget.label}`;
    if (lastExternalGuideKeyRef.current === guideKey) return;
    lastExternalGuideKeyRef.current = guideKey;

    window.setTimeout(() => {
      const node = fieldRefs[guidedTarget.field]?.current;
      node?.focus();
      node?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
  }, [fieldRefs, guidedTarget]);

  const identityReady = Boolean(formData.firstName && formData.lastName && formData.dob && formData.nationality && formData.address);
  const documentsUploaded = hasUploadedKycDocuments(documents);
  const documentsReady = hasCompleteKycDocuments(documents);
  const verificationReady = Boolean(identityReady && formData.idType && formData.idNumber && documentsReady);
  const accountBalance = profile?.balance ?? 0;
  const nicknameFallback = `#${(profile?.id ?? "00000000").replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const profileStatus = getProfileKycLabel(kycStatus, documents);

  const verificationNotice =
    kycStatus === "Verified"
      ? {
          icon: ShieldCheck,
          title: "Your account is verified.",
          text: "Identity documents are approved and your account is ready for full access.",
          tone: "success" as const,
        }
      : kycStatus === "Rejected"
        ? {
            icon: AlertCircle,
            title: "Verification needs attention.",
            text: "Upload clearer front and back document images, then save again.",
            tone: "danger" as const,
          }
        : documentsUploaded
          ? {
              icon: CheckCircle2,
              title: "Pending verification.",
              text: "Your uploaded documents are waiting for admin review. You will be marked verified once the admin approves them.",
              tone: "warning" as const,
            }
        : !identityReady
          ? {
              icon: AlertCircle,
              title: "You need full identity information before verifying your account.",
              text: "Complete the main personal fields on the left first, then add your document details.",
              tone: "danger" as const,
            }
          : !verificationReady
            ? {
                icon: FileText,
                title: "Documents verification is not complete yet.",
                text: "Add your ID type, ID number, and upload the front and back of your document.",
                tone: "warning" as const,
              }
            : {
                icon: CheckCircle2,
                title: "Verification files are ready.",
                text: "Add the required documents to send your profile for admin review.",
                tone: "warning" as const,
              };

  const selectedPhoneCountry = useMemo(
    () => getCountryOptionByCode(phoneCountryCode) ?? getCountryOptionByName(formData.nationality),
    [formData.nationality, phoneCountryCode],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === "phone") {
      const parsedPhone = splitStoredPhoneNumber(value);

      if (parsedPhone.countryCode) {
        setPhoneCountryCode(parsedPhone.countryCode);
      }

      setFormData((current) => ({
        ...current,
        phone: parsedPhone.countryCode ? parsedPhone.localNumber : value,
      }));
      return;
    }

    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextCountryName = e.target.value;
    const previousCountry = getCountryOptionByName(formData.nationality);
    const nextCountry = getCountryOptionByName(nextCountryName);

    setFormData((current) => ({ ...current, nationality: nextCountryName }));

    setPhoneCountryCode((currentPhoneCountryCode) => {
      if (!nextCountry?.code) return currentPhoneCountryCode;

      return !currentPhoneCountryCode || currentPhoneCountryCode === previousCountry?.code
        ? nextCountry.code
        : currentPhoneCountryCode;
    });
  };

  const handlePhoneCountryCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setPhoneCountryCode(e.target.value);

    window.requestAnimationFrame(() => {
      fieldRefs.phone.current?.focus();
    });
  };

  const updateAvatar = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Upload a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile photos must be 5MB or smaller.");
      return;
    }

    setIsUpdatingAvatar(true);

    try {
      const avatarUrl = await readFileAsDataUrl(file);
      await updateProfile({ avatar_url: avatarUrl });
      toast.success("Profile photo updated.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to update profile photo.");
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const removeAvatar = async () => {
    setIsUpdatingAvatar(true);

    try {
      await updateProfile({ avatar_url: null });
      toast.success("Profile photo removed.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to remove profile photo.");
    } finally {
      setIsUpdatingAvatar(false);
    }
  };

  const persistDocuments = async (nextDocuments: KycDocuments) => {
    await updateProfile({
      kyc_documents: nextDocuments,
      kyc_status: "Pending",
    });
    setDocuments(nextDocuments);
    setKycStatus("Pending");
  };

  const uploadDocument = async (slot: "front" | "back", file: File) => {
    if (!user) return;
    if (!["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.type)) {
      toast.error("Upload a PDF, PNG, JPG, or WEBP document.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Documents must be 10MB or smaller.");
      return;
    }

    setIsUploadingDoc(slot);

    try {
      const extension = file.name.split(".").pop() || "bin";
      const path = `kyc/${user.id}/${slot}_${Date.now()}.${extension}`;
      let url = "";
      let fallback = false;

      const { error: uploadError } = await supabase.storage.from("branding").upload(path, file, {
        upsert: true,
      });

      if (uploadError) {
        if (!file.type.startsWith("image/")) throw uploadError;
        url = await readFileAsDataUrl(file);
        fallback = true;
      } else {
        const { data } = supabase.storage.from("branding").getPublicUrl(path);
        url = data.publicUrl;
      }

      const nextDocuments: KycDocuments = {
        ...documents,
        [slot]: {
          name: file.name,
          url,
          mimeType: file.type,
          uploadedAt: new Date().toISOString(),
          path,
          fallback,
        },
      };

      await persistDocuments(nextDocuments);
      toast.success(`${slot === "front" ? "Front" : "Back"} document uploaded successfully.`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to upload document.");
    } finally {
      setIsUploadingDoc(null);
    }
  };

  const removeDocument = async (slot: "front" | "back") => {
    const nextDocuments: KycDocuments = {
      ...documents,
      [slot]: null,
    };

    try {
      await persistDocuments(nextDocuments);
      toast.success(`${slot === "front" ? "Front" : "Back"} document removed.`);
    } catch (error: any) {
      toast.error(error?.message || "Failed to remove document.");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      await updateProfile({
        ...formData,
        phone: formatPhoneNumber(selectedPhoneCountry?.dialCode, formData.phone),
        phoneCountry: selectedPhoneCountry?.code || null,
        phoneCountryCode: selectedPhoneCountry?.dialCode || null,
      });
      toast.success("Profile updated successfully.");
    } catch (error: any) {
      toast.error(error?.message || "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`w-full text-white ${compact ? "profile-personal-data-compact" : ""}`}>
      <AccountCurrencyModal isOpen={showCurrencyModal} onClose={() => setShowCurrencyModal(false)} />

      <div className="profile-personal-data-card overflow-hidden rounded-[24px] border border-white/8 bg-[#242a39] shadow-[0_24px_70px_rgba(0,0,0,0.28)]">
        <div className="profile-personal-data-summary border-b border-white/6 bg-[#262d3d] px-4 py-4 md:px-6">
          <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr]">
            <SummaryCard
              label="My current currency"
              value={currency}
              actionLabel="Change"
              onAction={() => setShowCurrencyModal(true)}
            />
            <SummaryCard label="Available for withdrawal" value={formatMoney(accountBalance)} />
            <SummaryCard label="In the account" value={formatMoney(accountBalance)} />
          </div>
        </div>

        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={handleSave} className="profile-personal-data-form border-b border-white/6 p-4 md:p-6 lg:border-b-0 lg:border-r lg:border-white/6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                disabled={isUpdatingAvatar}
                className="profile-avatar-button group relative h-[116px] w-[116px] overflow-hidden rounded-full bg-[#1f3a5d] shadow-[inset_0_0_0_10px_rgba(33,45,68,0.9)] transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-70"
                title="Upload profile photo"
              >
                <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <UserRound className="h-14 w-14 text-[#2693ff]" strokeWidth={1.8} />
                  )}

                  <div className="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex flex-col items-center gap-1 text-white">
                      <Camera className="h-5 w-5" />
                      <span className="text-[11px] font-bold uppercase tracking-[0.16em]">
                        {isUpdatingAvatar ? "Uploading" : "Upload"}
                      </span>
                    </div>
                  </div>
                </div>
                <KycAvatarBadge status={kycStatus} documents={documents} />
              </button>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="truncate text-[13px] text-[#aeb8ca]">{user?.email || "No email available"}</div>
                  {user?.email && (
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
                        emailVerified
                          ? "bg-emerald-500/15 text-emerald-300"
                          : "bg-[#0fa053]/15 text-[#d8f6e5]"
                      }`}
                    >
                      {emailVerified ? "Verified" : "Unverified"}
                    </span>
                  )}
                </div>
                <div className="mt-2 text-[18px] font-bold text-white">{profile?.username || user?.email || "Your account"}</div>
                <div className="mt-1 text-[14px] text-[#b8c3d7]">ID: {(profile?.id ?? "--------").replace(/-/g, "").slice(0, 8).toUpperCase()}</div>
                <div
                  className={`mt-3 inline-flex rounded-[8px] px-3 py-1 text-[12px] font-bold ${
                    profileStatus === "Verified"
                      ? "bg-green-500/15 text-green-400"
                      : profileStatus === "Rejected"
                        ? "bg-red-500/15 text-red-400"
                        : profileStatus === "Pending verification"
                          ? "bg-[#0fa053]/15 text-[#8be0af]"
                          : "bg-red-500/15 text-red-300"
                  }`}
                >
                  {profileStatus}
                </div>
                <div className="mt-2 text-[12px] text-[#90a0ba]">Click the photo to upload or replace your profile picture.</div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    disabled={isUpdatingAvatar}
                    className="inline-flex h-[42px] items-center gap-2 rounded-[10px] border border-white/10 bg-white/5 px-4 text-[13px] font-semibold text-[#e5edf9] transition-colors hover:bg-white/10 disabled:opacity-60"
                  >
                    <Camera className="h-4 w-4" />
                    {isUpdatingAvatar ? "Updating..." : "Change photo"}
                  </button>
                  {profile?.avatar_url && (
                    <button
                      type="button"
                      onClick={removeAvatar}
                      disabled={isUpdatingAvatar}
                      className="inline-flex h-[42px] items-center gap-2 rounded-[10px] border border-red-500/20 bg-red-500/10 px-4 text-[13px] font-semibold text-red-300 transition-colors hover:bg-red-500/15 disabled:opacity-60"
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="profile-fields-grid mt-6 grid gap-5">
              <FieldShell label="Nickname">
                <input
                  ref={fieldRefs.username}
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  className="h-[66px] w-full bg-transparent px-5 text-[18px] font-semibold text-white outline-none placeholder:text-[#626f85]"
                  placeholder={nicknameFallback}
                />
              </FieldShell>

              <div className="profile-field-pair grid gap-5 md:grid-cols-2">
                <FieldShell label="First Name">
                  <input
                    ref={fieldRefs.firstName}
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="h-[66px] w-full bg-transparent px-5 text-[18px] text-white outline-none placeholder:text-[#626f85]"
                    placeholder="Empty"
                  />
                </FieldShell>

                <FieldShell label="Last Name">
                  <input
                    ref={fieldRefs.lastName}
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="h-[66px] w-full bg-transparent px-5 text-[18px] text-white outline-none placeholder:text-[#626f85]"
                    placeholder="Empty"
                  />
                </FieldShell>
              </div>

              <div className="profile-field-pair grid gap-5 md:grid-cols-2">
                <FieldShell label="Date of birth">
                  <input
                    ref={fieldRefs.dob}
                    type="date"
                    name="dob"
                    value={formData.dob}
                    onChange={handleInputChange}
                    className="h-[66px] w-full bg-transparent px-5 text-[18px] text-white outline-none"
                  />
                </FieldShell>

                <FieldShell label="Phone">
                  <div className="grid sm:grid-cols-[220px_minmax(0,1fr)]">
                    <div className="border-b border-white/10 sm:border-b-0 sm:border-r sm:border-white/10">
                      <select
                        value={phoneCountryCode}
                        onChange={handlePhoneCountryCodeChange}
                        className="h-[58px] w-full appearance-none bg-transparent px-5 text-[15px] text-white outline-none sm:h-[66px]"
                      >
                        <option value="" className="bg-[#242a39]">
                          Select code
                        </option>
                        {PHONE_COUNTRY_OPTIONS.map((country) => (
                          <option key={country.code} value={country.code} className="bg-[#242a39]">
                            {country.name} ({country.dialCode})
                          </option>
                        ))}
                      </select>
                    </div>

                    <input
                      ref={fieldRefs.phone}
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      inputMode="tel"
                      autoComplete="tel-national"
                      className="h-[66px] w-full bg-transparent px-5 text-[18px] text-white outline-none placeholder:text-[#626f85]"
                      placeholder={selectedPhoneCountry?.dialCode ? `Type number after ${selectedPhoneCountry.dialCode}` : "Type phone number"}
                    />
                  </div>
                </FieldShell>
              </div>

              {!compact && (
                <FieldShell label="Email">
                  <input
                    type="text"
                    value={user?.email || ""}
                    disabled
                    className="h-[66px] w-full cursor-not-allowed bg-transparent px-5 text-[18px] text-[#8490a6] outline-none"
                  />
                </FieldShell>
              )}

              <EmailVerificationPanel hideWhenVerified={compact} variant="compact" />

              <FieldShell label="Country">
                <select
                  ref={fieldRefs.nationality}
                  name="nationality"
                  value={formData.nationality}
                  onChange={handleCountryChange}
                  className="h-[66px] w-full appearance-none bg-transparent px-5 text-[18px] text-white outline-none"
                >
                  <option value="" className="bg-[#242a39]">
                    Select country
                  </option>
                  {COUNTRY_OPTIONS.map((country) => (
                    <option key={country.code} value={country.name} className="bg-[#242a39]">
                      {country.name}
                    </option>
                  ))}
                </select>
              </FieldShell>

              <FieldShell label="Address">
                <textarea
                  ref={fieldRefs.address}
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className="min-h-[112px] w-full resize-none bg-transparent px-5 py-5 text-[18px] text-white outline-none placeholder:text-[#626f85]"
                  placeholder="Empty"
                />
              </FieldShell>

              <button
                type="submit"
                disabled={isSaving}
                className="mt-1 h-[58px] rounded-[10px] bg-[#1175d5] text-[17px] font-bold text-white transition-colors hover:bg-[#0d69c2] disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>

          <div className="profile-documents-panel p-4 md:p-6">
            <h3 className="text-[18px] font-bold text-white">Documents verification:</h3>

            <div
              className={`profile-verification-notice mt-6 rounded-[14px] border px-5 py-6 ${
                verificationNotice.tone === "success"
                  ? "border-[#0fa053]/30 bg-green-500/10 text-green-300"
                  : verificationNotice.tone === "warning"
                    ? "border-[#0fa053]/25 bg-[#0fa053]/10 text-[#d8f6e5]"
                    : "border-red-500/25 bg-red-500/10 text-red-200"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-full ${
                    verificationNotice.tone === "success"
                      ? "bg-green-500 text-white"
                      : verificationNotice.tone === "warning"
                        ? "bg-[#0fa053] text-white"
                        : "bg-[#ff6a5f] text-white"
                  }`}
                >
                  <verificationNotice.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[17px] font-semibold text-white">{verificationNotice.title}</div>
                  <div className="mt-1 text-[14px] leading-6 text-inherit/90">{verificationNotice.text}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-5">
              <FieldShell label="ID Type">
                <select
                  ref={fieldRefs.idType}
                  name="idType"
                  value={formData.idType}
                  onChange={handleInputChange}
                  className="h-[66px] w-full appearance-none bg-transparent px-5 text-[18px] text-white outline-none"
                >
                  <option value="" className="bg-[#242a39]">
                    Select document
                  </option>
                  {ID_OPTIONS.map((option) => (
                    <option key={option} value={option} className="bg-[#242a39]">
                      {option}
                    </option>
                  ))}
                </select>
              </FieldShell>

              <FieldShell label="ID Number">
                <input
                  ref={fieldRefs.idNumber}
                  type="text"
                  name="idNumber"
                  value={formData.idNumber}
                  onChange={handleInputChange}
                  className="h-[66px] w-full bg-transparent px-5 text-[18px] text-white outline-none placeholder:text-[#626f85]"
                  placeholder="Empty"
                />
              </FieldShell>

              <DocumentRow
                label="Front of document"
                document={documents.front ?? null}
                buttonRef={fieldRefs.frontDocument}
                uploading={isUploadingDoc === "front"}
                onUpload={() => frontInputRef.current?.click()}
                onRemove={() => removeDocument("front")}
              />

              <DocumentRow
                label="Back of document"
                document={documents.back ?? null}
                buttonRef={fieldRefs.backDocument}
                uploading={isUploadingDoc === "back"}
                onUpload={() => backInputRef.current?.click()}
                onRemove={() => removeDocument("back")}
              />
            </div>

            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) updateAvatar(file);
                event.currentTarget.value = "";
              }}
            />
            <input
              ref={frontInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadDocument("front", file);
                event.currentTarget.value = "";
              }}
            />
            <input
              ref={backInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) uploadDocument("back", file);
                event.currentTarget.value = "";
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const SummaryCard = ({
  label,
  value,
  actionLabel,
  onAction,
}: {
  label: string;
  value: string;
  actionLabel?: string;
  onAction?: () => void;
}) => (
  <div className="profile-summary-card rounded-[14px] border border-white/6 bg-[#242a39] px-4 py-4">
    <div className="text-[13px] text-[#8e9ab0]">{label}</div>
    <div className="mt-2 flex items-center gap-3">
      <div className="text-[18px] font-bold text-white">{value}</div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="rounded-[8px] bg-[#1175d5] px-3 py-1 text-[12px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-[#0d69c2]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  </div>
);

const FieldShell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="profile-field-shell relative rounded-[12px] border border-[#535d73] bg-[#242a39]">
    <div className="profile-field-label absolute left-4 top-0 -translate-y-1/2 bg-[#242a39] px-2 text-[12px] font-medium text-[#737e94]">
      {label}
    </div>
    {children}
  </div>
);

const DocumentRow = ({
  label,
  document,
  buttonRef,
  uploading,
  onUpload,
  onRemove,
}: {
  label: string;
  document: KycDocument | null;
  buttonRef: React.RefObject<HTMLButtonElement>;
  uploading: boolean;
  onUpload: () => void;
  onRemove: () => void;
}) => (
  <div className="profile-document-row rounded-[14px] border border-[#535d73] bg-[#242a39] p-4">
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[15px] font-semibold text-white">{label}</div>
        <div className="mt-1 truncate text-[12px] text-[#8f9bb0]">
          {document?.name || "No file uploaded yet"}
        </div>
      </div>
      <div
        className={`rounded-[8px] px-2.5 py-1 text-[11px] font-bold ${
          document?.url ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-300"
        }`}
      >
        {document?.url ? "Uploaded" : "Needed"}
      </div>
    </div>

    <div className="mt-4 flex flex-wrap gap-3">
      <button
        ref={buttonRef}
        type="button"
        onClick={onUpload}
        className="inline-flex items-center gap-2 rounded-[10px] bg-[#1175d5] px-4 py-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#0d69c2]"
      >
        <UploadCloud className="h-4 w-4" />
        {uploading ? "Uploading..." : "Upload"}
      </button>

      {document?.url && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-[10px] border border-white/10 bg-white/5 px-4 py-2.5 text-[13px] font-semibold text-[#d7deeb] transition-colors hover:bg-white/10"
        >
          Remove
        </button>
      )}
    </div>
  </div>
);


