import { useEffect, useMemo, useRef, useState } from "react";
import { Globe, Image as ImageIcon, Save, Search, Share2, Trash2, UploadCloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { WebsiteContentEditor } from "@/components/admin/WebsiteContentEditor";
import {
  applyPlatformSettingsToDocument,
  DEFAULT_PLATFORM_SETTINGS,
  normalizePlatformSettings,
  resolveSeoMetadata,
  type PlatformSettingsRecord,
  type TwitterCardType,
} from "@/lib/platformMetadata";
import {
  GUIDE_MEDIA_KEYS,
  createDefaultWebsiteContent,
  normalizeWebsiteContent,
  serializeWebsiteContent,
  type GuideMediaKey,
  type WebsiteContent,
} from "@/lib/websiteContent";

type UploadTarget = "logo" | "favicon" | "social" | "twitter" | "chartBackground" | `guide:${GuideMediaKey}`;

const CARD_CLASS = "rounded-2xl border border-[#1e2330] bg-[#1e2330] p-6 shadow-lg";
const INPUT_CLASS =
  "w-full rounded-lg border border-[#1e2330] bg-[#1c1f2d] px-4 py-2 text-sm text-white outline-none transition-colors focus:border-[#0fa053]";
const TEXTAREA_CLASS =
  "min-h-[110px] rounded-lg border border-[#1e2330] bg-[#1c1f2d] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#0fa053]";

const MAX_META_DESCRIPTION_LENGTH = 160;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MIN_SOCIAL_WIDTH = 600;
const MIN_SOCIAL_HEIGHT = 315;

const ROBOTS_OPTIONS = [
  "index, follow",
  "noindex, nofollow",
  "index, nofollow",
  "noindex, follow",
];

const TWITTER_CARD_OPTIONS: TwitterCardType[] = ["summary", "summary_large_image"];

const GUIDE_MEDIA_LABELS: Record<GuideMediaKey, { label: string; description: string }> = {
  chart: {
    label: "Chart and trading screen",
    description: "Main chart screenshots, interface highlights, and trading desk visuals.",
  },
  profile: {
    label: "Profile and account screens",
    description: "Profile, account, KYC, personal data, and verification screens.",
  },
  finance: {
    label: "Finance and funding screens",
    description: "Deposit, withdrawal, balance, and funding walkthrough visuals.",
  },
  security: {
    label: "Security and verification screens",
    description: "Password, active sessions, security, and verification visuals.",
  },
  chat: {
    label: "Chat and private messages",
    description: "General chat, private chat, support inbox, and messaging visuals.",
  },
  market: {
    label: "Market and asset browser",
    description: "Asset list, market browser, favorites, and quote selection visuals.",
  },
  orders: {
    label: "Trade order and pending orders",
    description: "Order panel, pending trades, trade results, and order controls.",
  },
  tournament: {
    label: "Tournaments",
    description: "Tournament list, participation, rebuy, and prize claim visuals.",
  },
  settings: {
    label: "Settings and chart tools",
    description: "Theme, language, indicators, drawings, chart type, and tool settings.",
  },
  mobile: {
    label: "Mobile and demo screenshots",
    description: "Mobile terminal, demo balance, onboarding, and responsive screens.",
  },
  signals: {
    label: "Signals and social trading",
    description: "Signals, copy trading, rankings, and social trading visuals.",
  },
  wallet: {
    label: "Wallet and payout screens",
    description: "Wallet, payout, payment methods, and transaction screen visuals.",
  },
  support: {
    label: "Support and help screens",
    description: "Support service, guides, reviews, applications, and help navigation.",
  },
  videoTrading: {
    label: "Trading tutorial thumbnail",
    description: "Thumbnail used for trading-related guide videos.",
  },
  videoMobile: {
    label: "Mobile tutorial thumbnail",
    description: "Thumbnail used for mobile, demo, and onboarding guide videos.",
  },
};

const getPlatformSettingsErrorMessage = (error: { message?: string } | null | undefined) => {
  const message = error?.message ?? "";

  if (
    message.includes("schema cache")
    || message.includes("website_content")
    || message.includes("canonical_url")
    || message.includes("custom_meta_tags")
    || message.includes("twitter_image_url")
    || message.includes("og_image_url")
  ) {
    return "Your Supabase platform_settings schema is outdated. Run the latest platform settings migrations, then try saving again.";
  }

  if (
    message.includes("row-level security")
    || message.includes("permission denied")
    || message.includes("new row violates row-level security policy")
  ) {
    return "This account is not allowed to update platform settings in the database. Make sure your user has the admin database role.";
  }

  return message || "An unknown error occurred while saving platform settings.";
};

const getPreviewDomain = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "initoption.com";
  }
};

const readImageDimensions = (file: File) =>
  new Promise<{ width: number; height: number }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({ width: image.width, height: image.height });
      URL.revokeObjectURL(objectUrl);
    };

    image.onerror = () => {
      reject(new Error("The selected image could not be read."));
      URL.revokeObjectURL(objectUrl);
    };

    image.src = objectUrl;
  });

const validateUpload = async (file: File, target: UploadTarget) => {
  if (!file.type.startsWith("image/")) {
    throw new Error("Only image files are allowed.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Images must be 5MB or smaller.");
  }

  if (target === "social" || target === "twitter") {
    const { width, height } = await readImageDimensions(file);

    if (width < MIN_SOCIAL_WIDTH || height < MIN_SOCIAL_HEIGHT) {
      throw new Error(`Social images must be at least ${MIN_SOCIAL_WIDTH}x${MIN_SOCIAL_HEIGHT}px.`);
    }
  }
};

const PlatformSettings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<PlatformSettingsRecord>(DEFAULT_PLATFORM_SETTINGS);
  const [websiteContent, setWebsiteContent] = useState<WebsiteContent>(() =>
    createDefaultWebsiteContent(DEFAULT_PLATFORM_SETTINGS.platform_name),
  );

  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const socialImageInputRef = useRef<HTMLInputElement>(null);
  const twitterImageInputRef = useRef<HTMLInputElement>(null);
  const chartBackgroundInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("platform_settings").select("*").limit(1).maybeSingle();

    if (error) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Failed to load platform settings",
        description: getPlatformSettingsErrorMessage(error),
        variant: "destructive",
      });
    } else {
      const normalizedSettings = normalizePlatformSettings((data as Partial<PlatformSettingsRecord> | null) ?? null);
      setSettings(normalizedSettings);
      setWebsiteContent(normalizeWebsiteContent(normalizedSettings.website_content, normalizedSettings.platform_name));
    }

    setLoading(false);
  };

  const updateSetting = <K extends keyof PlatformSettingsRecord>(key: K, value: PlatformSettingsRecord[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateGuideMedia = (key: GuideMediaKey, value: string) => {
    setWebsiteContent((previous) => {
      const nextMedia = { ...(previous.guideMedia ?? {}) };
      const nextValue = value.trim();

      if (nextValue) {
        nextMedia[key] = nextValue;
      } else {
        delete nextMedia[key];
      }

      return { ...previous, guideMedia: nextMedia };
    });
  };

  const updateTradingDefaults = (updates: Partial<WebsiteContent["tradingDefaults"]>) => {
    setWebsiteContent((previous) => ({
      ...previous,
      tradingDefaults: {
        ...previous.tradingDefaults,
        ...updates,
      },
    }));
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    target: UploadTarget,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    try {
      await validateUpload(file, target);
    } catch (error) {
      toast({
        title: "Invalid image",
        description: error instanceof Error ? error.message : "The selected image could not be used.",
        variant: "destructive",
      });
      return;
    }

    const guideMediaKey = target.startsWith("guide:") ? (target.replace("guide:", "") as GuideMediaKey) : null;
    const fileExt = file.name.split(".").pop() || "png";
    const filePath = guideMediaKey
      ? `guide-media/${guideMediaKey}_${Date.now()}.${fileExt}`
      : target === "chartBackground"
        ? `trading-backgrounds/default_${Date.now()}.${fileExt}`
      : `seo/${target}_${Date.now()}.${fileExt}`;

    setSaving(true);
    toast({ title: "Uploading image..." });

    const { error: uploadError } = await supabase.storage.from("branding").upload(filePath, file, {
      upsert: false,
    });

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    const { data: publicData } = supabase.storage.from("branding").getPublicUrl(filePath);

    if (guideMediaKey) {
      updateGuideMedia(guideMediaKey, publicData.publicUrl);
    } else if (target === "chartBackground") {
      updateTradingDefaults({ chartBackgroundImage: publicData.publicUrl });
    } else {
      if (target === "logo") updateSetting("logo_url", publicData.publicUrl);
      if (target === "favicon") updateSetting("favicon_url", publicData.publicUrl);
      if (target === "social") updateSetting("og_image_url", publicData.publicUrl);
      if (target === "twitter") updateSetting("twitter_image_url", publicData.publicUrl);
    }

    toast({
      title: "Image uploaded",
      description: "The image was uploaded successfully. Save changes to publish it.",
    });
    setSaving(false);
  };

  const handleSave = async () => {
    if (settings.meta_description.trim().length > MAX_META_DESCRIPTION_LENGTH) {
      toast({
        title: "Meta description is too long",
        description: `Keep it at ${MAX_META_DESCRIPTION_LENGTH} characters or fewer for search results.`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const { id, created_at, updated_at, ...updateData } = settings;
    const payload = {
      ...updateData,
      website_content: serializeWebsiteContent(websiteContent),
    };

    if (id) {
      const { error } = await supabase
        .from("platform_settings")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", id);

      if (error) {
        toast({
          title: "Save failed",
          description: getPlatformSettingsErrorMessage(error),
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from("platform_settings").insert(payload);

      if (error) {
        toast({
          title: "Initialization failed",
          description: getPlatformSettingsErrorMessage(error),
          variant: "destructive",
        });
        setSaving(false);
        return;
      }
    }

    applyPlatformSettingsToDocument(settings);
    toast({ title: "Platform settings published" });
    await fetchSettings();
    setSaving(false);
  };

  const seoPreview = useMemo(
    () => resolveSeoMetadata(settings, typeof window !== "undefined" ? window.location.href : "https://initoption.com/"),
    [settings],
  );

  const googlePreviewDomain = useMemo(() => getPreviewDomain(seoPreview.canonicalUrl), [seoPreview.canonicalUrl]);
  const socialPreviewDomain = googlePreviewDomain;
  const twitterUsesLargeImage = seoPreview.twitterCardType === "summary_large_image";
  const hasTwitterImageOverride =
    settings.twitter_image_url.trim().length > 0 && settings.twitter_image_url.trim() !== settings.og_image_url.trim();
  const mainContent = (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <div className={CARD_CLASS}>
          <h3 className="mb-4 border-b border-[#1e2330] pb-2 text-lg font-bold text-white">General Info</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Platform Name</label>
              <input
                type="text"
                value={settings.platform_name}
                onChange={(event) => updateSetting("platform_name", event.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Support Email</label>
              <input
                type="email"
                value={settings.support_email}
                onChange={(event) => updateSetting("support_email", event.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Default Timezone</label>
              <select
                value={settings.timezone}
                onChange={(event) => updateSetting("timezone", event.target.value)}
                className={INPUT_CLASS}
              >
                <option value="UTC">UTC (GMT+0)</option>
                <option value="EST">EST (GMT-4)</option>
                <option value="EAT">EAT (GMT+3)</option>
              </select>
            </div>
          </div>
        </div>

        <div className={CARD_CLASS}>
          <h3 className="mb-4 border-b border-[#1e2330] pb-2 text-lg font-bold text-white">Trading Limits</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Min Trade Amount ($)</label>
              <input
                type="number"
                value={settings.min_trade_amount}
                onChange={(event) => updateSetting("min_trade_amount", Number(event.target.value))}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Max Trade Amount ($)</label>
              <input
                type="number"
                value={settings.max_trade_amount}
                onChange={(event) => updateSetting("max_trade_amount", Number(event.target.value))}
                className={INPUT_CLASS}
              />
            </div>
            <label className="flex items-center gap-3 rounded-xl border border-[#1e2330] bg-[#1c1f2d] px-4 py-3">
              <input
                type="checkbox"
                checked={settings.enforce_max_exposure}
                onChange={(event) => updateSetting("enforce_max_exposure", event.target.checked)}
                className="h-4 w-4 rounded border-[#1e2330] bg-[#1c1f2d] accent-[#0fa053]"
              />
              <span className="text-sm font-medium text-slate-200">Enforce max exposure per asset</span>
            </label>
          </div>
        </div>

        <div className={CARD_CLASS}>
          <h3 className="mb-4 border-b border-[#1e2330] pb-2 text-lg font-bold text-white">Security Settings</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">
                M-PESA Withdrawal Approval Threshold (KES)
              </label>
              <input
                type="number"
                min="0"
                value={settings.mpesa_withdrawal_approval_threshold_kes}
                onChange={(event) =>
                  updateSetting("mpesa_withdrawal_approval_threshold_kes", Number(event.target.value))
                }
                className={INPUT_CLASS}
              />
              <p className="mt-2 text-xs text-slate-400">
                Withdrawals above this KES amount stay pending until a finance admin approves them.
              </p>
            </div>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-[#1e2330] bg-[#1c1f2d] px-4 py-3">
              <span className="text-sm font-medium text-slate-200">Enforce 2FA for all users</span>
              <input
                type="checkbox"
                checked={settings.enforce_2fa}
                onChange={(event) => updateSetting("enforce_2fa", event.target.checked)}
                className="h-4 w-4 rounded border-[#1e2330] bg-[#1c1f2d] accent-[#0fa053]"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-[#1e2330] bg-[#1c1f2d] px-4 py-3">
              <span className="text-sm font-medium text-slate-200">Require KYC before withdrawal</span>
              <input
                type="checkbox"
                checked={settings.require_kyc_withdrawal}
                onChange={(event) => updateSetting("require_kyc_withdrawal", event.target.checked)}
                className="h-4 w-4 rounded border-[#1e2330] bg-[#1c1f2d] accent-[#0fa053]"
              />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-[#1e2330] bg-[#1c1f2d] px-4 py-3">
              <span className="text-sm font-medium text-slate-200">Strict password policy</span>
              <input
                type="checkbox"
                checked={settings.strict_password}
                onChange={(event) => updateSetting("strict_password", event.target.checked)}
                className="h-4 w-4 rounded border-[#1e2330] bg-[#1c1f2d] accent-[#0fa053]"
              />
            </label>
          </div>
        </div>

        <div className={CARD_CLASS}>
          <h3 className="mb-4 border-b border-[#1e2330] pb-2 text-lg font-bold text-white">Bonuses & Referrals</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Welcome Bonus (%)</label>
              <input
                type="number"
                value={settings.welcome_bonus_pct}
                onChange={(event) => updateSetting("welcome_bonus_pct", Number(event.target.value))}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Referral Commission (%)</label>
              <input
                type="number"
                value={settings.referral_commission_pct}
                onChange={(event) => updateSetting("referral_commission_pct", Number(event.target.value))}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        </div>
      </div>

      <div className={CARD_CLASS}>
        <h3 className="mb-4 border-b border-[#1e2330] pb-2 text-lg font-bold text-white">Chart Theming & Colors</h3>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { key: "chart_up_color", label: "Bull Candle (Up)" },
            { key: "chart_down_color", label: "Bear Candle (Down)" },
            { key: "chart_bg_color", label: "Chart Background" },
          ].map((field) => (
            <div key={field.key}>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">{field.label}</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={settings[field.key as keyof PlatformSettingsRecord] as string}
                  onChange={(event) =>
                    updateSetting(field.key as keyof PlatformSettingsRecord, event.target.value as never)
                  }
                  className="h-10 w-10 cursor-pointer rounded border-none bg-transparent p-0 outline-none"
                />
                <input
                  type="text"
                  value={settings[field.key as keyof PlatformSettingsRecord] as string}
                  onChange={(event) =>
                    updateSetting(field.key as keyof PlatformSettingsRecord, event.target.value as never)
                  }
                  className={`${INPUT_CLASS} font-mono uppercase`}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-[#1e2330] bg-[#1c1f2d] p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <h4 className="text-base font-bold text-white">Default Trading Background</h4>
              <p className="mt-1 text-sm text-slate-400">
                This image appears behind the trading chart for users who have not uploaded their own background.
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <input
                ref={chartBackgroundInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => void handleFileUpload(event, "chartBackground")}
              />
              <button
                type="button"
                onClick={() => chartBackgroundInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-lg border border-[#0fa053]/30 bg-[#0fa053]/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#0fa053] transition-colors hover:bg-[#0fa053]/20"
              >
                <UploadCloud className="h-4 w-4" />
                Upload
              </button>
              {websiteContent.tradingDefaults.chartBackgroundImage ? (
                <button
                  type="button"
                  onClick={() => updateTradingDefaults({ chartBackgroundImage: "" })}
                  className="inline-flex items-center gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs font-bold uppercase tracking-wider text-red-300 transition-colors hover:bg-red-500/20"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">
                  Background Image URL
                </label>
                <input
                  type="text"
                  value={websiteContent.tradingDefaults.chartBackgroundImage}
                  onChange={(event) => updateTradingDefaults({ chartBackgroundImage: event.target.value })}
                  className={INPUT_CLASS}
                  placeholder="https://... or upload an image"
                />
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Image Opacity
                  </label>
                  <span className="text-xs font-bold text-[#0fa053]">
                    {websiteContent.tradingDefaults.chartBackgroundOpacity}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={websiteContent.tradingDefaults.chartBackgroundOpacity}
                  onChange={(event) =>
                    updateTradingDefaults({ chartBackgroundOpacity: Number(event.target.value) })
                  }
                  className="h-2 w-full accent-[#0fa053]"
                />
              </div>
            </div>

            <div
              className="min-h-[148px] overflow-hidden rounded-xl border border-[#1e2330] bg-[#111827]"
              style={{
                backgroundImage: websiteContent.tradingDefaults.chartBackgroundImage
                  ? `linear-gradient(rgba(17,24,39,${Math.max(0.05, 1 - websiteContent.tradingDefaults.chartBackgroundOpacity / 100)}), rgba(17,24,39,${Math.max(0.05, 1 - websiteContent.tradingDefaults.chartBackgroundOpacity / 100)})), url("${websiteContent.tradingDefaults.chartBackgroundImage}")`
                  : "linear-gradient(135deg, #111827 0%, #1c1f2d 100%)",
                backgroundPosition: "center",
                backgroundSize: "cover",
              }}
            >
              <div className="flex h-full min-h-[148px] items-center justify-center px-4 text-center text-xs font-bold uppercase tracking-[0.16em] text-slate-300">
                Chart preview
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={CARD_CLASS}>
        <h3 className="mb-4 flex items-center gap-2 border-b border-[#1e2330] pb-2 text-lg font-bold text-white">
          <ImageIcon className="h-5 w-5 text-[#0fa053]" />
          Site Branding & Appearance
        </h3>

        <div className="grid gap-6 lg:grid-cols-2">
          {[
            {
              label: "Main Site Logo",
              value: settings.logo_url,
              onChange: (value: string) => updateSetting("logo_url", value),
              ref: logoInputRef,
              uploadTarget: "logo" as const,
              accept: "image/*",
              helper: "Updates the logo shown on landing, auth, trading, and admin surfaces.",
            },
            {
              label: "Tab Favicon",
              value: settings.favicon_url,
              onChange: (value: string) => updateSetting("favicon_url", value),
              ref: faviconInputRef,
              uploadTarget: "favicon" as const,
              accept: "image/*,.ico",
              helper: "Used for the browser tab icon and default share fallback.",
            },
          ].map((field) => (
            <div key={field.label} className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">{field.label}</label>
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#1e2330] bg-[#1c1f2d]">
                  {field.value ? (
                    <img src={field.value} alt={field.label} className="h-full w-full object-contain p-1" />
                  ) : (
                    <span className="text-xs text-gray-600">No Image</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                      placeholder="Paste a public URL or upload an image..."
                      className={INPUT_CLASS}
                    />
                    <input
                      ref={field.ref}
                      type="file"
                      accept={field.accept}
                      className="hidden"
                      onChange={(event) => void handleFileUpload(event, field.uploadTarget)}
                    />
                    <button
                      type="button"
                      onClick={() => field.ref.current?.click()}
                      className="rounded-lg bg-[#0fa053]/20 p-2 text-[#0fa053] transition-colors hover:bg-[#0fa053] hover:text-white"
                      title={`Upload ${field.label}`}
                    >
                      <UploadCloud size={16} />
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">{field.helper}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <WebsiteContentEditor content={websiteContent} onChange={setWebsiteContent} />

      <div className={CARD_CLASS}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <ImageIcon className="h-5 w-5 text-[#62d5ff]" />
              Trading Guide Media
            </h3>
            <p className="mt-2 max-w-3xl text-sm text-slate-400">
              Upload the real InitOption screenshots and graphics used on the help and guide page. Empty slots show a
              neutral placeholder, so sample graphics never appear by accident.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {GUIDE_MEDIA_KEYS.map((key) => {
            const meta = GUIDE_MEDIA_LABELS[key];
            const mediaUrl = websiteContent.guideMedia?.[key] ?? "";

            return (
              <div key={key} className="rounded-xl border border-[#2b3142] bg-[#171b28] p-4">
                <div className="aspect-[16/9] overflow-hidden rounded-lg border border-[#2b3142] bg-[#111522]">
                  {mediaUrl ? (
                    <img src={mediaUrl} alt={meta.label} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center text-xs text-slate-500">
                      <ImageIcon className="h-8 w-8 text-slate-600" />
                      No guide image assigned
                    </div>
                  )}
                </div>

                <p className="mt-3 text-sm font-semibold text-white">{meta.label}</p>
                <p className="mt-1 min-h-[38px] text-xs leading-5 text-slate-400">{meta.description}</p>

                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(event) => updateGuideMedia(key, event.target.value)}
                  placeholder="https://..."
                  className={`${INPUT_CLASS} mt-3`}
                />

                <div className="mt-3 flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[#33415f] bg-[#20283b] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#273149]">
                    <UploadCloud className="h-4 w-4" />
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => void handleFileUpload(event, `guide:${key}`)}
                    />
                  </label>

                  {mediaUrl ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/20"
                      onClick={() => updateGuideMedia(key, "")}
                    >
                      <Trash2 className="h-4 w-4" />
                      Clear
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={CARD_CLASS}>
        <div className="flex flex-col gap-3 border-b border-[#1e2330] pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-white">
              <Globe className="h-5 w-5 text-emerald-400" />
              SEO & Metadata
            </h3>
            <p className="mt-1 text-sm text-slate-300">
              Control the metadata exposed to search engines, social cards, and the public HTML shell.
            </p>
          </div>
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
            Defaults are used automatically when optional fields are left empty.
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-[#1e2330] bg-[#1c1f2d] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Social Share Image</div>
                  <p className="mt-1 max-w-2xl text-xs text-slate-400">
                    This is the main image used when Init Option links are shared on social platforms. It powers
                    Open Graph cards and becomes the default X/Twitter image unless you set a Twitter-specific
                    override below.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => socialImageInputRef.current?.click()}
                  className="rounded-lg bg-[#0fa053]/20 p-2 text-[#0fa053] transition-colors hover:bg-[#0fa053] hover:text-white"
                >
                  <UploadCloud size={16} />
                </button>
              </div>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={socialImageInputRef}
                onChange={(event) => void handleFileUpload(event, "social")}
              />

              <div className="mt-4 flex items-center gap-4">
                <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#1e2330] bg-[#1e2330]">
                  {settings.og_image_url.trim() ? (
                    <img src={settings.og_image_url} alt="Social share preview" className="h-full w-full object-cover" />
                  ) : (
                    <span className="px-3 text-center text-xs text-gray-600">No social image</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <input
                    type="text"
                    value={settings.og_image_url}
                    onChange={(event) => updateSetting("og_image_url", event.target.value)}
                    placeholder="Paste a public social image URL or upload one..."
                    className={INPUT_CLASS}
                  />
                  <p className="mt-2 text-xs text-slate-400">
                    Recommended size: 1200x630px. Minimum 600x315px.
                    {hasTwitterImageOverride
                      ? " A separate Twitter/X image is currently active below."
                      : " Leave the Twitter/X image blank below to reuse this one everywhere."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Site Title</label>
              <input
                type="text"
                value={settings.site_title}
                onChange={(event) => updateSetting("site_title", event.target.value)}
                placeholder="Init Option - Trade with up to 95% Profit | Fast Withdrawals"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">Meta Description</label>
                <span
                  className={`text-xs ${
                    settings.meta_description.length > MAX_META_DESCRIPTION_LENGTH ? "text-red-400" : "text-slate-400"
                  }`}
                >
                  {settings.meta_description.length}/{MAX_META_DESCRIPTION_LENGTH}
                </span>
              </div>
              <Textarea
                value={settings.meta_description}
                onChange={(event) => updateSetting("meta_description", event.target.value)}
                placeholder="Trade with Init Option. Get a 70% welcome bonus, real-time charts, instant demo, and weekly tournaments. Start trading today."
                className={TEXTAREA_CLASS}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Meta Keywords</label>
              <input
                type="text"
                value={settings.meta_keywords}
                onChange={(event) => updateSetting("meta_keywords", event.target.value)}
                placeholder="trading platform, real-time charts, demo account, trading tournaments"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Canonical URL</label>
              <input
                type="url"
                value={settings.canonical_url}
                onChange={(event) => updateSetting("canonical_url", event.target.value)}
                placeholder="https://initoption.com/"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Robots Directive</label>
              <select
                value={settings.robots_directive}
                onChange={(event) => updateSetting("robots_directive", event.target.value)}
                className={INPUT_CLASS}
              >
                {ROBOTS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">OG Title</label>
              <input
                type="text"
                value={settings.og_title}
                onChange={(event) => updateSetting("og_title", event.target.value)}
                placeholder="Open Graph title for Facebook and LinkedIn"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">OG Description</label>
              <Textarea
                value={settings.og_description}
                onChange={(event) => updateSetting("og_description", event.target.value)}
                placeholder="Description for social sharing cards."
                className={TEXTAREA_CLASS}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Twitter Card Type</label>
              <select
                value={settings.twitter_card_type}
                onChange={(event) => updateSetting("twitter_card_type", event.target.value as TwitterCardType)}
                className={INPUT_CLASS}
              >
                {TWITTER_CARD_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Twitter Title</label>
              <input
                type="text"
                value={settings.twitter_title}
                onChange={(event) => updateSetting("twitter_title", event.target.value)}
                placeholder="Title for X/Twitter card"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Twitter Description</label>
              <Textarea
                value={settings.twitter_description}
                onChange={(event) => updateSetting("twitter_description", event.target.value)}
                placeholder="Description for X/Twitter preview card."
                className={TEXTAREA_CLASS}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-[#1e2330] bg-[#1c1f2d] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Twitter Image</div>
                  <p className="mt-1 text-xs text-slate-400">Leave blank to reuse the social share image automatically.</p>
                </div>
                <button
                  type="button"
                  onClick={() => twitterImageInputRef.current?.click()}
                  className="rounded-lg bg-[#0fa053]/20 p-2 text-[#0fa053] transition-colors hover:bg-[#0fa053] hover:text-white"
                >
                  <UploadCloud size={16} />
                </button>
              </div>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={twitterImageInputRef}
                onChange={(event) => void handleFileUpload(event, "twitter")}
              />
              <input
                type="text"
                value={settings.twitter_image_url}
                onChange={(event) => updateSetting("twitter_image_url", event.target.value)}
                placeholder="Public image URL"
                className={INPUT_CLASS}
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-300">Custom Meta Tags</label>
              <Textarea
                value={settings.custom_meta_tags}
                onChange={(event) => updateSetting("custom_meta_tags", event.target.value)}
                placeholder='Either JSON like [{"name":"theme-color","content":"#121f27"}] or raw HTML like <meta name="theme-color" content="#121f27">'
                className={`${TEXTAREA_CLASS} min-h-[140px]`}
              />
              <p className="mt-2 text-xs text-slate-400">
                Raw HTML is limited to safe `meta` and `link` tags when injected into the page head.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  const previewContent = (
    <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
      <div className={CARD_CLASS}>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
          <Search className="h-5 w-5 text-[#0fa053]" />
          Search Preview
        </h3>
        <div className="rounded-2xl border border-[#1e2330] bg-[#1c1f2d] p-5">
          <div className="text-sm text-[#8ab4f8] sm:text-[20px]">{seoPreview.siteTitle}</div>
          <div className="mt-1 text-xs text-emerald-400">{googlePreviewDomain}</div>
          <p className="mt-2 text-sm leading-6 text-slate-300">{seoPreview.metaDescription}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#1e2330] bg-[#1e2330] px-2.5 py-1 text-[11px] text-slate-300">
              {seoPreview.robotsDirective}
            </span>
            {seoPreview.metaKeywords ? (
              <span className="rounded-full border border-[#1e2330] bg-[#1e2330] px-2.5 py-1 text-[11px] text-slate-300">
                Keywords set
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className={CARD_CLASS}>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-white">
          <Share2 className="h-5 w-5 text-emerald-400" />
          Social Preview
        </h3>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-2xl border border-[#1e2330] bg-[#1c1f2d]">
            <div className="aspect-[1.91/1] bg-[#162029]">
              {seoPreview.ogImageUrl ? (
                <img src={seoPreview.ogImageUrl} alt="Open Graph preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">No OG image selected</div>
              )}
            </div>
            <div className="border-t border-[#1e2330] px-4 py-3">
              <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{socialPreviewDomain}</div>
              <div className="mt-1 text-sm font-semibold text-white">{seoPreview.ogTitle}</div>
              <p className="mt-1 text-sm leading-6 text-slate-300">{seoPreview.ogDescription}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[#1e2330] bg-[#1c1f2d]">
            <div className={`grid ${twitterUsesLargeImage ? "grid-cols-1" : "grid-cols-[1fr_110px]"} gap-0`}>
              <div className={`px-4 py-3 ${twitterUsesLargeImage ? "order-2" : "order-1"}`}>
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Twitter / X</div>
                <div className="mt-1 text-sm font-semibold text-white">{seoPreview.twitterTitle}</div>
                <p className="mt-1 text-sm leading-6 text-slate-300">{seoPreview.twitterDescription}</p>
                <div className="mt-3 text-[11px] uppercase tracking-[0.18em] text-[#0fa053]">
                  {seoPreview.twitterCardType}
                </div>
              </div>

              <div className={`${twitterUsesLargeImage ? "order-1 aspect-[1.91/1]" : "order-2 aspect-square"} bg-[#162029]`}>
                {seoPreview.twitterImageUrl ? (
                  <img src={seoPreview.twitterImageUrl} alt="Twitter preview" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-center text-sm text-slate-400">No Twitter image</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={CARD_CLASS}>
        <h3 className="text-lg font-bold text-white">Resolved Metadata</h3>
        <div className="mt-4 space-y-3 text-sm text-slate-300">
          <div className="rounded-xl border border-[#1e2330] bg-[#1c1f2d] px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Canonical URL</div>
            <div className="mt-1 break-all text-white">{seoPreview.canonicalUrl}</div>
          </div>
          <div className="rounded-xl border border-[#1e2330] bg-[#1c1f2d] px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Site Title Used</div>
            <div className="mt-1 text-white">{seoPreview.siteTitle}</div>
          </div>
          <div className="rounded-xl border border-[#1e2330] bg-[#1c1f2d] px-4 py-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Fallback Behavior</div>
            <p className="mt-1 text-slate-300">
              Empty social titles and descriptions inherit from the site metadata, and Twitter/X reuses the shared
              social image when its own image field is blank.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return <div className="flex justify-center py-10 text-slate-400">Loading live settings...</div>;
  }

  return (
    <div className="animate-in space-y-6 fade-in duration-300">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Platform Settings</h2>
          <p className="mt-1 text-sm text-slate-300">
            Manage branding, trading defaults, and the SEO metadata shown for Init Option across search and social platforms.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0fa053] px-4 py-2 text-sm font-medium text-white transition-colors shadow-lg shadow-[#0fa053]/20 hover:bg-[#1e2330] disabled:opacity-50"
        >
          <Save size={16} />
          {saving ? "Saving..." : "Save & Publish"}
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        {mainContent}
        {previewContent}
      </div>
    </div>
  );
};

export default PlatformSettings;

