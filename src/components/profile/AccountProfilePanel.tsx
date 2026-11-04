import { IdentityDocumentPreview } from "./IdentityDocumentPreview";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
} from "react";
import {
  Check,
  ChevronRight,
  Clock3,
  FileCheck2,
  LockKeyhole,
  RefreshCw,
  ShieldCheck,
  UploadCloud,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";
import { COUNTRY_OPTIONS } from "@/lib/countries";
import {
  EMPTY_ACCOUNT,
  IDENTITY_FILE_LIMIT,
  requiredIdentitySlots,
  validateAccount,
  validateIdentity,
  type AccountDetails,
} from "@/lib/identityValidation";
import {
  identityRequest,
  uploadIdentityDocument,
  viewIdentityDocument,
  type IdentityState,
} from "@/lib/identityApi";
import { EmailVerificationPanel } from "./EmailVerificationPanel";
import { ProfileUploadPhoto } from "./ProfileUploadPhoto";
import { ProfileSettings } from "./ProfileSettings";
import { AccountCurrencyModal } from "./AccountCurrencyModal";

export const identityInput =
  "mt-2 min-h-12 w-full min-w-0 rounded-xl border border-white/10 bg-[#151b27] px-3 py-3 text-base text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/15 disabled:cursor-not-allowed disabled:opacity-60";
export const identityButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-[#09231c] transition hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 disabled:cursor-not-allowed disabled:opacity-40";
export function ProfileField({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block min-w-0 text-sm font-medium text-slate-300">
      {label}
      <input {...props} className={identityInput} />
    </label>
  );
}
const statusCopy = {
  Draft: [
    "Not submitted",
    "Save your details, add your document and submit when you are ready.",
  ],
  Submitted: [
    "Under review",
    "Your submission is with our review team. It stays locked until a decision is made.",
  ],
  Verified: [
    "Identity verified",
    "Your identity review is complete. Contact support if your legal details need correcting.",
  ],
  Rejected: [
    "Changes requested",
    "Read the reviewer’s instructions, replace any affected images and submit again.",
  ],
} as const;
export function AccountProfilePanel() {
  const { profile, user, refreshProfile, deleteAccount } = useAuth();
  const { currency } = useCurrency();
  const activeUser = useRef(user?.id);
  activeUser.current = user?.id;
  const [tab, setTab] = useState<"details" | "identity" | "settings">(
    "details",
  );
  const [state, setState] = useState<IdentityState | null>(null),
    [form, setForm] = useState<AccountDetails>(EMPTY_ACCOUNT);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const [documentType, setDocumentType] = useState("national_id"),
    [documentNumber, setDocumentNumber] = useState(""),
    [consent, setConsent] = useState(false);
  const [preview, setPreview] = useState<string | null>(null),
    [currencyOpen, setCurrencyOpen] = useState(false),
    [photoOpen, setPhotoOpen] = useState(false),
    [deleteText, setDeleteText] = useState("");
  const accept = (next: IdentityState) => {
    if (activeUser.current === user?.id) setState(next);
  };
  async function load() {
    setLoading(true);
    setError("");
    try {
      const next = await identityRequest("status");
      if (activeUser.current !== user?.id) return;
      accept(next);
      setForm(
        next.details ?? {
          ...EMPTY_ACCOUNT,
          username: profile?.username ?? "",
          country: profile?.nationality ?? "",
        },
      );
      setDocumentType(next.verification.documentType || "national_id");
      setDocumentNumber(next.verification.documentNumber || "");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    let active = true;
    setState(null);
    setPreview(null);
    setForm(EMPTY_ACCOUNT);
    setConsent(false);
    setError("");
    setLoading(true);
    identityRequest("status")
      .then((next) => {
        if (!active) return;
        accept(next);
        setForm(
          next.details ?? {
            ...EMPTY_ACCOUNT,
            username: profile?.username ?? "",
            country: profile?.nationality ?? "",
          },
        );
        setDocumentType(next.verification.documentType || "national_id");
        setDocumentNumber(next.verification.documentNumber || "");
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  const status = state?.verification.status ?? "Draft",
    locked = status === "Submitted" || status === "Verified";
  const dirty =
    !!state?.details &&
    (Object.keys(EMPTY_ACCOUNT) as (keyof AccountDetails)[]).some(
      (key) => form[key] !== state.details![key],
    );
  const complete = state?.details
    ? Object.values(state.details).filter(Boolean).length
    : 0;
  async function run(key: string, action: () => Promise<void>) {
    if (busy) return;
    setBusy(key);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy("");
    }
  }
  const save = (event: FormEvent) => {
    event.preventDefault();
    void run("save", async () => {
      const details = validateAccount(form);
      accept(await identityRequest("profile", { details }));
      setForm(details);
      setMessage("Your personal details have been saved to your account.");
      await refreshProfile().catch(() => undefined);
    });
  };
  const submit = () =>
    void run("submit", async () => {
      if (!state?.details || dirty)
        throw new Error("Save your personal details before submitting.");
      validateIdentity({ documentType, documentNumber, consent });
      accept(
        await identityRequest("submit", {
          documentType,
          documentNumber,
          consent,
        }),
      );
      setConsent(false);
      setMessage(
        "Identity submitted for review. Uploading alone does not verify your account.",
      );
      await refreshProfile().catch(() => undefined);
    });
  const choose = (slot: "front" | "back", file: File | undefined) => {
    if (!file) return;
    void run(slot, async () => {
      if (
        !["image/jpeg", "image/png"].includes(file.type) ||
        file.size > IDENTITY_FILE_LIMIT ||
        !file.size
      )
        throw new Error("Choose a JPG or PNG image no larger than 2 MB.");
      accept(await uploadIdentityDocument(slot, file, documentType));
      setMessage(
        `${slot === "front" ? "Front / photo page" : "Back side"} uploaded. Submit your documents when all required sides are ready.`,
      );
    });
  };
  return (
    <section className="mx-auto w-full max-w-6xl min-w-0 space-y-6 px-1 pb-12 text-white sm:px-3">
      <header className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#203848] via-[#1b2737] to-[#17202d] p-5 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/5">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Your profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound className="h-7 w-7 text-emerald-300" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-emerald-300">
                Your account
              </p>
              <h2 className="mt-1 break-words text-2xl font-bold sm:text-3xl">
                Profile & verification
              </h2>
              <p className="mt-1 break-all text-sm text-slate-400">
                {user?.email}
              </p>
            </div>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-white/10 bg-black/15 px-3 py-2 text-xs font-semibold">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            {state
              ? statusCopy[status][0]
              : loading
                ? "Loading status…"
                : "Status unavailable"}
          </span>
        </div>
        <p className="mt-6 max-w-xl text-sm leading-6 text-slate-300">
          Keep your account details accurate and verify your identity with a
          clear, guided review process.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            [
              "01",
              "Personal details",
              state ? `${complete}/7 fields saved` : "Loading saved details",
            ],
            [
              "02",
              "Identity documents",
              state ? statusCopy[status][0] : "Awaiting connection",
            ],
            ["03", "Account security", "Manage your preferences"],
          ].map(([n, title, sub]) => (
            <div
              key={n}
              className="flex items-center gap-3 rounded-2xl border border-white/5 bg-black/10 p-3"
            >
              <span className="text-xs font-bold text-emerald-300">{n}</span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="mt-1 text-xs text-slate-400">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </header>
      <nav
        aria-label="Account sections"
        className="flex gap-2 overflow-x-auto border-b border-white/10 pb-3"
      >
        {(
          [
            ["details", "Personal details", UserRound],
            ["identity", "Identity verification", FileCheck2],
            ["settings", "Security & preferences", LockKeyhole],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            aria-current={tab === key ? "page" : undefined}
            onClick={() => {
              setTab(key);
              setMessage("");
              setError("");
            }}
            className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${tab === key ? "bg-emerald-400/10 text-emerald-300" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-rose-400/30 bg-rose-400/10 p-4 text-sm text-rose-200"
        >
          {error}{" "}
          {!state && (
            <button className="ml-3 underline" onClick={() => void load()}>
              Try again
            </button>
          )}
        </div>
      )}
      {message && (
        <p
          role="status"
          className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200"
        >
          {message}
        </p>
      )}
      {loading ? (
        <p role="status" className="flex items-center gap-3 p-8 text-slate-400">
          <RefreshCw className="h-4 w-4 animate-spin" />
          Loading your account…
        </p>
      ) : (
        (state || tab === "settings") && (
          <>
            {tab === "details" && (
              <div className="grid items-start gap-5 lg:grid-cols-[1fr_280px]">
                <form
                  onSubmit={save}
                  className="rounded-2xl border border-white/10 bg-[#1c2533] p-5 sm:p-7"
                >
                  <h3 className="text-lg font-bold">Personal information</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Use your legal name exactly as shown on your document.
                    Required fields are marked *.
                  </p>
                  {locked && (
                    <p className="mt-4 rounded-xl bg-sky-400/10 p-3 text-sm text-sky-200">
                      Legal identity details are locked{" "}
                      {status === "Submitted"
                        ? "during review"
                        : "after verification"}
                      . Contact support for corrections.
                    </p>
                  )}
                  <fieldset
                    disabled={!!busy}
                    className="mt-6 grid min-w-0 gap-5 sm:grid-cols-2"
                  >
                    <ProfileField
                      label="Username *"
                      autoComplete="username"
                      required
                      maxLength={30}
                      value={form.username}
                      onChange={(e) =>
                        setForm({ ...form, username: e.target.value })
                      }
                    />
                    <ProfileField
                      label="Email address"
                      type="email"
                      value={user?.email ?? ""}
                      disabled
                    />
                    <ProfileField
                      label="Legal first name *"
                      autoComplete="given-name"
                      required
                      maxLength={80}
                      disabled={locked}
                      value={form.firstName}
                      onChange={(e) =>
                        setForm({ ...form, firstName: e.target.value })
                      }
                    />
                    <ProfileField
                      label="Legal last name *"
                      autoComplete="family-name"
                      required
                      maxLength={80}
                      disabled={locked}
                      value={form.lastName}
                      onChange={(e) =>
                        setForm({ ...form, lastName: e.target.value })
                      }
                    />
                    <ProfileField
                      label="Date of birth *"
                      type="date"
                      autoComplete="bday"
                      required
                      disabled={locked}
                      value={form.dob}
                      onChange={(e) =>
                        setForm({ ...form, dob: e.target.value })
                      }
                    />
                    <label className="text-sm font-medium text-slate-300">
                      Country of residence *
                      <select
                        required
                        disabled={locked}
                        autoComplete="country-name"
                        value={form.country}
                        onChange={(e) =>
                          setForm({ ...form, country: e.target.value })
                        }
                        className={identityInput}
                      >
                        <option value="">Select country</option>
                        {COUNTRY_OPTIONS.map((c) => (
                          <option key={c.code} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <ProfileField
                      label="Phone number *"
                      type="tel"
                      autoComplete="tel"
                      placeholder="+254712345678"
                      required
                      value={form.phone}
                      onChange={(e) =>
                        setForm({ ...form, phone: e.target.value })
                      }
                    />
                    <ProfileField
                      label="Residential address *"
                      autoComplete="street-address"
                      placeholder="Street, city, postal code"
                      required
                      maxLength={240}
                      value={form.address}
                      onChange={(e) =>
                        setForm({ ...form, address: e.target.value })
                      }
                    />
                  </fieldset>
                  <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
                    <p className="max-w-xs text-xs leading-5 text-slate-400">
                      Legal details and documents are not shown on your public
                      trading profile. Username and country may be public.
                    </p>
                    <button
                      disabled={!!busy}
                      className={identityButton}
                      type="submit"
                    >
                      {busy === "save" ? "Saving…" : "Save personal details"}
                      <Check className="h-4 w-4" />
                    </button>
                  </div>
                </form>
                <aside className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-[#1c2533] p-5">
                    <ShieldCheck className="mb-3 h-6 w-6 text-emerald-300" />
                    <h3 className="font-bold">A clear path to verification</h3>
                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      Save your information, upload a valid document and submit
                      it to our review team. We will show your review outcome
                      here.
                    </p>
                    <button
                      className="mt-5 flex min-h-11 items-center gap-2 text-sm font-semibold text-emerald-300"
                      onClick={() => setTab("identity")}
                    >
                      Continue to verification
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <EmailVerificationPanel />
                </aside>
              </div>
            )}
            {tab === "identity" && (
              <div className="grid items-start gap-5 lg:grid-cols-[1fr_280px]">
                <div className="space-y-5">
                  <div
                    className={`rounded-2xl border p-5 ${status === "Rejected" ? "border-amber-400/30 bg-amber-400/10" : "border-white/10 bg-[#1c2533]"}`}
                  >
                    <div className="flex items-center gap-3">
                      <Clock3 className="h-5 w-5 text-emerald-300" />
                      <h3 className="text-lg font-bold">
                        {statusCopy[status][0]}
                      </h3>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {statusCopy[status][1]}
                    </p>
                    {state.verification.reviewNote && (
                      <div className="mt-4 rounded-xl bg-black/15 p-4 text-sm">
                        <strong>Reviewer’s message</strong>
                        <p className="mt-2 whitespace-pre-wrap break-words text-slate-300">
                          {state.verification.reviewNote}
                        </p>
                      </div>
                    )}
                    {state.verification.submittedAt && (
                      <p className="mt-3 text-xs text-slate-400">
                        Submitted{" "}
                        {new Date(
                          state.verification.submittedAt,
                        ).toLocaleString()}{" "}
                        · Reference {state.verification.revision}
                      </p>
                    )}
                    <button
                      disabled={!!busy}
                      onClick={() =>
                        void run("refresh", async () => {
                          accept(await identityRequest("status"));
                          setMessage("Review status refreshed.");
                        })
                      }
                      className="mt-4 flex min-h-11 items-center gap-2 text-sm text-emerald-300"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Refresh status
                    </button>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-[#1c2533] p-5 sm:p-7">
                    <h3 className="text-lg font-bold">
                      Government-issued identity document
                    </h3>
                    {state.details && (
                      <p className="mt-3 rounded-xl bg-white/5 p-3 text-sm text-slate-300">
                        Saved identity: {state.details.firstName}{" "}
                        {state.details.lastName} · Born {state.details.dob} ·{" "}
                        {state.details.country}
                      </p>
                    )}
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Your document must be valid, legible and belong to you. A
                      passport needs its photo page; other documents need both
                      sides.
                    </p>
                    <fieldset
                      disabled={locked || !!busy}
                      className="mt-6 grid gap-5 sm:grid-cols-2"
                    >
                      <label className="text-sm text-slate-300">
                        Document type
                        <select
                          className={identityInput}
                          value={documentType}
                          onChange={(e) => {
                            setDocumentType(e.target.value);
                            setConsent(false);
                          }}
                        >
                          <option value="national_id">
                            National identity card
                          </option>
                          <option value="passport">Passport</option>
                          <option value="driving_licence">
                            Driving licence
                          </option>
                        </select>
                      </label>
                      <ProfileField
                        label="Document number"
                        autoComplete="off"
                        maxLength={40}
                        value={documentNumber}
                        onChange={(e) => setDocumentNumber(e.target.value)}
                      />
                    </fieldset>
                    <div className="mt-6 grid gap-4 sm:grid-cols-2">
                      {requiredIdentitySlots(documentType).map((slot) => {
                        const doc = state.verification.documents.find(
                          (d) =>
                            d.slot === slot && d.documentType === documentType,
                        );
                        return (
                          <div
                            key={slot}
                            className="min-w-0 rounded-2xl border border-dashed border-white/20 bg-[#151b27] p-5"
                          >
                            <UploadCloud className="mb-3 h-6 w-6 text-emerald-300" />
                            <h4 className="text-sm font-semibold">
                              {slot === "back"
                                ? "Back side"
                                : documentType === "passport"
                                  ? "Passport photo page"
                                  : "Front side"}
                            </h4>
                            <p className="mt-2 truncate text-xs text-slate-400">
                              {doc ? doc.name : "JPG or PNG · Maximum 2 MB"}
                            </p>
                            {doc && (
                              <div className="mt-3 flex flex-wrap gap-4">
                                <button
                                  type="button"
                                  disabled={!!busy}
                                  className="min-h-11 text-sm text-emerald-300"
                                  onClick={() =>
                                    void run("preview", async () => {
                                      const next =
                                        await viewIdentityDocument(slot);
                                      if (activeUser.current === user?.id)
                                        setPreview(next);
                                      else URL.revokeObjectURL(next);
                                    })
                                  }
                                >
                                  View securely
                                </button>
                                {!locked && (
                                  <button
                                    type="button"
                                    disabled={!!busy}
                                    className="min-h-11 text-sm text-rose-300"
                                    onClick={() =>
                                      void run("remove", async () =>
                                        accept(
                                          await identityRequest("remove", {
                                            slot,
                                          }),
                                        ),
                                      )
                                    }
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            )}
                            <label
                              className={`mt-3 flex min-h-11 items-center justify-center rounded-xl border border-white/10 px-3 text-sm font-semibold ${locked || busy ? "opacity-40" : "cursor-pointer hover:bg-white/5"}`}
                            >
                              <input
                                className="sr-only"
                                aria-label={`Upload ${slot} document`}
                                type="file"
                                accept="image/jpeg,image/png"
                                disabled={locked || !!busy}
                                onChange={(e) => {
                                  choose(slot, e.target.files?.[0]);
                                  e.target.value = "";
                                }}
                              />
                              {busy === slot
                                ? "Uploading…"
                                : doc
                                  ? "Replace image"
                                  : "Choose image"}
                            </label>
                          </div>
                        );
                      })}
                    </div>
                    {!locked && (
                      <>
                        <label className="mt-6 flex cursor-pointer items-start gap-3 text-sm leading-6 text-slate-300">
                          <input
                            type="checkbox"
                            checked={consent}
                            onChange={(e) => setConsent(e.target.checked)}
                            className="mt-1 h-5 w-5 shrink-0 accent-emerald-400"
                            disabled={!!busy}
                          />
                          I confirm these are my own documents and the
                          information is accurate. I consent to authorized staff
                          reviewing my identity documents for account
                          verification.
                        </label>
                        <button
                          disabled={
                            !!busy ||
                            !consent ||
                            !state.details ||
                            dirty ||
                            requiredIdentitySlots(documentType).some(
                              (slot) =>
                                !state.verification.documents.some(
                                  (d) =>
                                    d.slot === slot &&
                                    d.documentType === documentType,
                                ),
                            )
                          }
                          onClick={submit}
                          className={`${identityButton} mt-6 w-full`}
                        >
                          {busy === "submit"
                            ? "Submitting…"
                            : status === "Rejected"
                              ? "Resubmit for review"
                              : "Submit for review"}
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        {(!state.details || dirty) && (
                          <button
                            onClick={() => setTab("details")}
                            className="mt-3 min-h-11 text-sm text-amber-200 underline"
                          >
                            Save your personal details first
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <aside className="rounded-2xl border border-white/10 bg-[#1c2533] p-5">
                  <LockKeyhole className="mb-3 h-6 w-6 text-emerald-300" />
                  <h3 className="font-bold">Before you upload</h3>
                  <ul className="mt-4 space-y-4 text-sm leading-6 text-slate-400">
                    {[
                      "Use a valid, unexpired original document.",
                      "Show all four corners without glare or blur.",
                      "Do not cover, crop out or edit document information.",
                      "Your legal name and date of birth must match your saved details.",
                      "Images are privately stored and accessed through authenticated requests.",
                    ].map((text) => (
                      <li key={text} className="flex gap-2">
                        <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-300" />
                        {text}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-slate-500">
                    This is a manual document review, not automated document
                    authenticity or biometric verification. No guaranteed review
                    time is implied.
                  </p>
                </aside>
              </div>
            )}
            {tab === "settings" && (
              <div className="space-y-6">
                <div className="flex flex-wrap gap-4 rounded-2xl border border-white/10 bg-[#1c2533] p-5">
                  <button
                    className={identityButton}
                    onClick={() => setPhotoOpen(!photoOpen)}
                  >
                    Manage profile photo
                  </button>
                  <button
                    className={identityButton}
                    onClick={() => setCurrencyOpen(true)}
                  >
                    Account currency: {currency}
                  </button>
                </div>
                {photoOpen && <ProfileUploadPhoto />}
                <ProfileSettings />
                <div className="rounded-2xl border border-rose-500/20 p-5">
                  <h3 className="font-bold">Delete account</h3>
                  <p className="my-3 text-sm text-slate-400">
                    This permanently deletes your account and associated
                    identity records. Type DELETE to confirm.
                  </p>
                  <input
                    aria-label="Confirm account deletion"
                    autoComplete="off"
                    className={identityInput}
                    value={deleteText}
                    onChange={(e) => setDeleteText(e.target.value)}
                  />
                  <button
                    disabled={!!busy || deleteText !== "DELETE"}
                    onClick={() =>
                      void run("delete", async () => {
                        const result = await deleteAccount();
                        if (result.error) throw new Error(result.error.message);
                      })
                    }
                    className="mt-4 min-h-11 rounded-xl bg-rose-500/15 px-5 text-sm font-semibold text-rose-300 disabled:opacity-40"
                  >
                    Delete my account
                  </button>
                </div>
              </div>
            )}
          </>
        )
      )}
      {currencyOpen && (
        <AccountCurrencyModal isOpen onClose={() => setCurrencyOpen(false)} />
      )}
      {preview && (
        <IdentityDocumentPreview
          url={preview}
          onClose={() => setPreview(null)}
        />
      )}
    </section>
  );
}
