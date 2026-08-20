import { createRef, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronUp,
  FileText,
  Globe2,
  ShieldCheck,
  Trash2,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cloudinaryClient } from "@/integrations/cloudinary/client";
import { useAuth } from "@/contexts/AuthContext";
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
import { EmailVerificationPanel } from "./EmailVerificationPanel";

export type GuideField =
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

export type GuideTarget = {
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

const ID_OPTIONS = ["ID card", "Passport", "Residence permit", "Driver's license"];

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
  const [showIdentityModal, setShowIdentityModal] = useState(false);
  const [documentUploadReady, setDocumentUploadReady] = useState(
    Boolean(p?.idType || hasUploadedKycDocuments(initialDocuments)),
  );

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
    setDocumentUploadReady(Boolean(p?.idType || hasUploadedKycDocuments(((p?.kyc_documents ?? p?.kycDocuments) ?? {}) as KycDocuments)));
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

      const result = await cloudinaryClient.upload(file, "kyc");
      url = result.url;

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

  const handleIdentityDocumentSelected = async (selection: { countryName: string; idType: string }) => {
    setFormData((current) => ({
      ...current,
      nationality: selection.countryName,
      idType: selection.idType,
    }));
    setDocumentUploadReady(true);
    setShowIdentityModal(false);

    try {
      await updateProfile({
        nationality: selection.countryName,
        idType: selection.idType,
      });
      toast.success("Document type saved. Upload the required document images to continue.");
      window.setTimeout(() => {
        fieldRefs.idNumber.current?.focus();
        fieldRefs.idNumber.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 120);
    } catch (error: any) {
      toast.error(error?.message || "Failed to save document selection.");
    }
  };

  return (
    <div className={`w-full text-white ${compact ? "profile-personal-data-compact" : ""}`}>
      <div className="profile-personal-data-card overflow-hidden rounded-[18px] border border-white/8 bg-[#293042] shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
        <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={handleSave} className="profile-personal-data-form border-b border-white/6 bg-[#293042] p-4 md:p-6 lg:border-b-0 lg:border-r lg:border-white/6">
            <div data-verification-tour="status" className="flex flex-col gap-4 sm:flex-row sm:items-center">
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

            <div data-verification-tour="personal-details" className="profile-fields-grid mt-6 grid gap-5">
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
                        <option value="" className="bg-[var(--trading-header-bg)]">
                          Select code
                        </option>
                        {PHONE_COUNTRY_OPTIONS.map((country) => (
                          <option key={country.code} value={country.code} className="bg-[var(--trading-header-bg)]">
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
                  <option value="" className="bg-[var(--trading-header-bg)]">
                    Select country
                  </option>
                  {COUNTRY_OPTIONS.map((country) => (
                    <option key={country.code} value={country.name} className="bg-[var(--trading-header-bg)]">
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

          <div data-verification-tour="documents" className="profile-documents-panel bg-[#293042] p-4 md:p-6">
            <h3 className="text-[18px] font-bold text-white">Documents verification:</h3>

            {!identityReady ? (
              <VerificationNotice notice={verificationNotice} />
            ) : !documentUploadReady && !documentsUploaded ? (
              <VerificationDocumentsCard onStart={() => setShowIdentityModal(true)} />
            ) : (
              <>
                <VerificationNotice notice={verificationNotice} />

                <div className="mt-6 grid gap-5">
                  <FieldShell label="ID Type">
                    <select
                      ref={fieldRefs.idType}
                      name="idType"
                      value={formData.idType}
                      onChange={handleInputChange}
                      className="h-[66px] w-full appearance-none bg-transparent px-5 text-[18px] text-white outline-none"
                    >
                      <option value="" className="bg-[var(--trading-header-bg)]">
                        Select document
                      </option>
                      {ID_OPTIONS.map((option) => (
                        <option key={option} value={option} className="bg-[var(--trading-header-bg)]">
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
              </>
            )}

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

      {showIdentityModal && (
        <IdentityVerificationModal
          initialCountry={formData.nationality}
          initialIdType={formData.idType}
          onClose={() => setShowIdentityModal(false)}
          onComplete={handleIdentityDocumentSelected}
        />
      )}
    </div>
  );
};

const VerificationNotice = ({
  notice,
}: {
  notice: {
    icon: typeof AlertCircle;
    title: string;
    text: string;
    tone: "success" | "warning" | "danger";
  };
}) => (
  <div
    className={`profile-verification-notice mt-6 rounded-[14px] border px-5 py-6 ${
      notice.tone === "success"
        ? "border-[#293042] bg-[#293042] text-white"
        : notice.tone === "warning"
          ? "border-[#0fa053]/25 bg-[#0fa053]/10 text-[#d8f6e5]"
          : "border-red-500/25 bg-red-500/10 text-red-200"
    }`}
  >
    <div className="flex items-start gap-4">
      <div
        className={`mt-0.5 flex h-10 w-10 items-center justify-center rounded-full ${
          notice.tone === "success"
            ? "bg-green-500 text-white"
            : notice.tone === "warning"
              ? "bg-[#0fa053] text-white"
              : "bg-[#ff6a5f] text-white"
        }`}
      >
        <notice.icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-[17px] font-semibold text-white">{notice.title}</div>
        <div className="mt-1 text-[14px] leading-6 text-inherit/90">{notice.text}</div>
      </div>
    </div>
  </div>
);

const VerificationDocumentsCard = ({ onStart }: { onStart: () => void }) => (
  <div className="mt-6 rounded-[4px] border border-[#0e72c8] bg-[#21334a] p-5 shadow-[0_14px_34px_rgba(0,0,0,0.18)]">
    <div className="flex items-center justify-between gap-4 border-b border-white/12 pb-4">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1587e8] text-white">
          <AlertCircle className="h-5 w-5" />
        </span>
        <h4 className="text-[16px] font-bold text-white">Verification of documents</h4>
      </div>
      <ChevronUp className="h-5 w-5 text-white" />
    </div>

    <p className="mt-3 max-w-[360px] text-[14px] font-semibold leading-[1.35] text-white">
      Please upload a color photo or scanned image of your regular civil passport, driving license, or National
      Identity card.
    </p>

    <button
      type="button"
      onClick={onStart}
      className="mt-4 h-11 w-full rounded-[4px] bg-[#117bd8] text-[15px] font-bold text-white shadow-[0_10px_24px_rgba(17,123,216,0.22)] transition hover:bg-[#1387ec]"
    >
      Upload Documents
    </button>

    <p className="mt-3 text-[10px] font-semibold leading-[1.25] text-[#74839b]">
      Account verification means the provision of an official document certifying the Client's identity. This procedure
      can be initiated by the Company's security department at any time.
    </p>
  </div>
);

const IdentityVerificationModal = ({
  initialCountry,
  initialIdType,
  onClose,
  onComplete,
}: {
  initialCountry: string;
  initialIdType: string;
  onClose: () => void;
  onComplete: (selection: { countryName: string; idType: string }) => Promise<void>;
}) => {
  const [step, setStep] = useState<"privacy" | "document">("privacy");
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [countryName, setCountryName] = useState(initialCountry || "Kenya");
  const [idType, setIdType] = useState(initialIdType || "");
  const [isSavingSelection, setIsSavingSelection] = useState(false);

  const country = getCountryOptionByName(countryName) ?? getCountryOptionByName("Kenya") ?? COUNTRY_OPTIONS[0];

  const finishSelection = async () => {
    if (!countryName || !idType) return;
    setIsSavingSelection(true);
    try {
      await onComplete({ countryName, idType });
    } finally {
      setIsSavingSelection(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[180] flex items-center justify-center bg-[#0b1020]/78 p-4 backdrop-blur-[5px]">
      <div className="relative w-full max-w-[492px] rounded-[6px] border border-white/[0.06] bg-[#2d3447] px-8 pb-7 pt-8 text-white shadow-[0_30px_90px_rgba(2,7,19,0.58)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 text-[#98a1b4] transition hover:text-white"
          aria-label="Close identity verification"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-[22px] font-bold">Identity Verification</h2>
        <div className="mt-5 border-t border-dashed border-white/14" />

        {step === "privacy" ? (
          <div className="mx-auto mt-8 max-w-[390px]">
            <div className="mb-8 flex justify-end">
              <span className="inline-flex h-11 items-center gap-2 rounded-full bg-[#17191f] px-4 text-[15px] font-bold">
                <Globe2 className="h-4 w-4" />
                En
              </span>
            </div>

            <h3 className="text-[25px] font-bold">Data and Privacy</h3>
            <label className="mt-8 flex cursor-pointer items-start gap-4 text-[16px] font-semibold leading-[1.45] text-[#eef2f8]">
              <input
                type="checkbox"
                checked={acceptedPrivacy}
                onChange={(event) => setAcceptedPrivacy(event.target.checked)}
                className="mt-1 h-6 w-6 shrink-0 appearance-none rounded-[7px] border border-white/40 bg-[#202636] checked:border-[#1587e8] checked:bg-[#1587e8]"
              />
              <span>
                I confirm that I have read the <span className="text-[#108ef2]">Privacy Notice</span> and the{" "}
                <span className="text-[#108ef2]">Notification to Processing of Personal Data</span>
              </span>
            </label>

            <button
              type="button"
              disabled={!acceptedPrivacy}
              onClick={() => setStep("document")}
              className="mt-5 h-12 w-full rounded-[10px] bg-[#1067b2] text-[16px] font-bold text-white shadow-[0_12px_28px_rgba(0,0,0,0.18)] transition hover:bg-[#1376ca] disabled:cursor-not-allowed disabled:opacity-55"
            >
              Continue
            </button>
          </div>
        ) : (
          <div className="mt-8 px-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-[17px] font-bold">Step</span>
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/50 text-[16px] font-bold">
                  1/1
                </span>
              </div>
              <span className="inline-flex h-11 items-center gap-2 rounded-full bg-[#17191f] px-4 text-[15px] font-bold">
                <Globe2 className="h-4 w-4" />
                En
              </span>
            </div>

            <h3 className="mt-9 max-w-[330px] text-[25px] font-bold leading-[1.25]">
              Select type and issuing country of your identity document
            </h3>

            <label className="mt-9 block text-[16px] font-bold">
              Issuing country <span className="text-[#ff5b4f]">*</span>
            </label>
            <div className="mt-4 flex items-center gap-3 border-b border-white/10 pb-4">
              <span className="text-[20px]">{country?.code === "KE" ? "🇰🇪" : "🌐"}</span>
              <select
                value={countryName}
                onChange={(event) => setCountryName(event.target.value)}
                className="w-full appearance-none bg-transparent text-[16px] font-semibold text-white outline-none"
              >
                {COUNTRY_OPTIONS.map((option) => (
                  <option key={option.code} value={option.name} className="bg-[#2d3447] text-white">
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-8 text-[16px] font-bold">
              Document type <span className="text-[#ff5b4f]">*</span>
            </div>
            <div className="mt-4 space-y-5">
              {ID_OPTIONS.map((option) => (
                <label key={option} className="flex cursor-pointer items-center justify-between gap-4 text-[16px] font-semibold">
                  <span>{option}</span>
                  <input
                    type="radio"
                    name="identity-document-type"
                    value={option}
                    checked={idType === option}
                    onChange={(event) => setIdType(event.target.value)}
                    className="h-6 w-6 appearance-none rounded-full border border-white/45 bg-[#1d2230] checked:border-[#ffffff] checked:bg-[#117bd8]"
                  />
                </label>
              ))}
            </div>

            <div className="mt-8 text-[13px] font-bold text-[#9aa3b5]">
              <span className="text-[#ff5b4f]">*</span> Required fields
            </div>
            <button
              type="button"
              disabled={!countryName || !idType || isSavingSelection}
              onClick={finishSelection}
              className="mt-3 h-12 w-full rounded-[10px] bg-[#1067b2] text-[16px] font-bold text-white shadow-[0_12px_28px_rgba(0,0,0,0.18)] transition hover:bg-[#1376ca] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isSavingSelection ? "Saving..." : "Continue"}
            </button>
          </div>
        )}

        <div className="mt-7 text-center text-[11px] font-bold text-[#9aa3b5]">Powered by sumsub</div>
      </div>
    </div>
  );
};

const FieldShell = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="profile-field-shell relative rounded-[10px] border border-[var(--trading-border-color)] bg-[#293042]">
    <div className="profile-field-label absolute left-4 top-0 -translate-y-1/2 bg-[#293042] px-2 text-[12px] font-medium text-[#737e94]">
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
  <div className="profile-document-row rounded-[10px] border border-[var(--trading-border-color)] bg-[#293042] p-4">
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


