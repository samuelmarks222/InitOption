import { api } from "@/integrations/api/client";
import { realtime } from "@/integrations/pusher/realtime";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle,
  CircleHelp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  CreditCard,
  Edit2,
  ExternalLink,
  Eye,
  EyeOff,
  LogOut,
  Minus,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
  Wallet,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useVip } from "@/contexts/VipContext";
import { VipBadge } from "@/components/vip/VipBadge";
import { useCurrency } from "@/contexts/CurrencyContext";
import { AccountCurrencyModal } from "@/components/profile/AccountCurrencyModal";
import { formatCurrencyAmount } from "@/lib/currency";
import { clearCryptoDepositCheckoutCache } from "@/lib/cryptoDepositCheckoutCache";
import { requestDepositReview } from "@/lib/deposits";
import { requestMobileMoneyDeposit, requestMobileMoneyWithdrawal, type MobileMoneyDepositPayload } from "@/lib/mobileMoney";
import AccountLevelsModal from "./AccountLevelsModal";
import { convertUsdToKesWithdrawalAmount, MPESA_METHOD_LABEL } from "@/lib/mobileMoneyShared";
import { requestWithdrawal } from "@/lib/withdrawals";
import {
  createCryptoDepositInstruction,
  getLatestOpenCryptoDepositInstruction,
  getCryptoInstructionStatusCopy,
  isAutomatedCryptoMode,
  mapCryptoDepositInstructionRecordToPayload,
  recoverCryptoDepositCheckout,
  type CryptoDepositInstructionPayload,
} from "@/lib/cryptoDeposits";
import { useDepositBonus } from "@/hooks/useDepositBonus";
import { isPlisioInstructionAddress, isPlisioSupportedCryptoMethod } from "@/lib/plisio";

export type AccountType = "live" | "demo" | "tournament";

const CRYPTO_ICON: Record<string, string> = {
  BTC: "https://assets.coincap.io/assets/icons/btc@2x.png",
  ETH: "https://assets.coincap.io/assets/icons/eth@2x.png",
  USDT: "https://assets.coincap.io/assets/icons/usdt@2x.png",
  BNB: "https://assets.coincap.io/assets/icons/bnb@2x.png",
  SOL: "https://assets.coincap.io/assets/icons/sol@2x.png",
  XRP: "https://assets.coincap.io/assets/icons/xrp@2x.png",
  USDC: "https://assets.coincap.io/assets/icons/usdc@2x.png",
  ADA: "https://assets.coincap.io/assets/icons/ada@2x.png",
  AVAX: "https://assets.coincap.io/assets/icons/avax@2x.png",
  DOGE: "https://assets.coincap.io/assets/icons/doge@2x.png",
  DOT: "https://assets.coincap.io/assets/icons/dot@2x.png",
  MATIC: "https://assets.coincap.io/assets/icons/matic@2x.png",
  LTC: "https://assets.coincap.io/assets/icons/ltc@2x.png",
  SHIB: "https://assets.coincap.io/assets/icons/shib@2x.png",
  TRX: "https://assets.coincap.io/assets/icons/trx@2x.png",
  LINK: "https://assets.coincap.io/assets/icons/link@2x.png",
  UNI: "https://assets.coincap.io/assets/icons/uni@2x.png",
  TON: "https://assets.coincap.io/assets/icons/ton@2x.png",
};

type CryptoPaymentMethod = Tables<"crypto_payment_methods">;
type DepositStep = "methods" | "checkout";
type DepositCategory = "popular" | "epay" | "crypto";
type DepositMethodOption = {
  id: string;
  attributionMode?: string | null;
  category: DepositCategory;
  confirmationsRequired?: number;
  name: string;
  memoLabel?: string | null;
  subtitle: string;
  symbol: string;
  network?: string;
  minAmount: number;
  maxAmount: number;
  available: boolean;
  iconType: "crypto" | "wallet" | "bank";
  walletAddress?: string | null;
  qrCodeUrl?: string | null;
};

type ActiveCryptoInstruction = CryptoDepositInstructionPayload & {
  detected_tx_hash: string | null;
  observed_confirmations: number;
  paymentMethod: DepositMethodOption;
};

const buildActiveCryptoInstruction = ({
  detectedTxHash = null,
  instruction,
  observedConfirmations = 0,
  paymentMethod,
}: {
  detectedTxHash?: string | null;
  instruction: CryptoDepositInstructionPayload;
  observedConfirmations?: number;
  paymentMethod: DepositMethodOption;
}): ActiveCryptoInstruction => ({
  ...instruction,
  detected_tx_hash: detectedTxHash,
  observed_confirmations: observedConfirmations,
  paymentMethod,
});

const CHECKOUT_WINDOW_MS = 24 * 60 * 60 * 1000;
const CRYPTO_PRIORITY = ["USDT", "USDC", "BNB", "ETH", "BTC", "LTC", "TRX", "MATIC", "ADA", "XRP", "SOL"];
const NETWORK_PRIORITY = ["TRC-20", "TRC20", "BEP-20", "BEP20", "ERC-20", "ERC20", "POLYGON"];
const MODAL_BG = "#13232d";
const SURFACE_BG = "#1a2e39";
const INNER_BG = "#121f27";
const PANEL_BORDER = "rgba(134, 201, 212, 0.14)";

const STATIC_DEPOSIT_METHODS: DepositMethodOption[] = [
  {
    id: "epay:mpesa",
    category: "epay",
    name: "M-Pesa (Instant Pay)",
    subtitle: "Mobile money",
    symbol: "MPESA",
    minAmount: 5,
    maxAmount: 2000,
    available: true,
    iconType: "wallet",
  },
  {
    id: "epay:airtel",
    category: "epay",
    name: "Airtel Money",
    subtitle: "Instant settlement",
    symbol: "AIRTEL",
    minAmount: 5,
    maxAmount: 2000,
    available: true,
    iconType: "wallet",
  },
];

const CATEGORY_COPY: Record<
  DepositCategory,
  { title: string; description: string; accent: string; text: string }
> = {
  popular: {
    title: "Popular",
    description: "Fastest deposit routes",
    accent: "from-slate-700/90 to-slate-800/90",
    text: "text-white",
  },
  epay: {
    title: "E-Pay",
    description: "Wallets and mobile money",
    accent: "from-slate-700/90 to-slate-800/90",
    text: "text-white",
  },
  crypto: {
    title: "Crypto",
    description: "On-chain deposits",
    accent: "from-emerald-500 to-emerald-600",
    text: "text-white",
  },
};

const getMethodLimits = (method: CryptoPaymentMethod) => {
  const symbol = method.symbol.toUpperCase();
  const network = method.network.toUpperCase();

  if (symbol === "BTC") return { minAmount: 50, maxAmount: 100000 };
  if (symbol === "ETH") return { minAmount: 20, maxAmount: 75000 };
  if (network.includes("TRC")) return { minAmount: 10, maxAmount: 50000 };
  if (network.includes("ERC")) return { minAmount: 10, maxAmount: 50000 };
  if (network.includes("BEP")) return { minAmount: 10, maxAmount: 50000 };
  if (network.includes("POLYGON")) return { minAmount: 10, maxAmount: 50000 };
  return { minAmount: 15, maxAmount: 50000 };
};

const getNetworkRank = (network: string) => {
  const normalized = network.toUpperCase();
  const index = NETWORK_PRIORITY.findIndex((entry) => normalized.includes(entry));
  return index === -1 ? NETWORK_PRIORITY.length : index;
};

const getCryptoPriority = (method: CryptoPaymentMethod) => {
  const symbolIndex = CRYPTO_PRIORITY.indexOf(method.symbol.toUpperCase());
  return symbolIndex === -1 ? CRYPTO_PRIORITY.length : symbolIndex;
};

const getCryptoAutomationPriority = (method: Pick<CryptoPaymentMethod, "attribution_mode">) => {
  if (method.attribution_mode === "dynamic_address") return 0;
  if (method.attribution_mode === "memo") return 1;
  return 2;
};

const getCryptoMethodName = (method: CryptoPaymentMethod) => {
  const symbol = method.symbol.toUpperCase();
  const network = method.network.toUpperCase();
  if (symbol === "USDT" || symbol === "USDC") return `${symbol} (${network})`;
  return `${method.coin_name} (${symbol})`;
};

const getCryptoIcon = (symbol: string) => {
  const normalized = symbol.toUpperCase();
  return CRYPTO_ICON[normalized] ?? `https://assets.coincap.io/assets/icons/${normalized.toLowerCase()}@2x.png`;
};

const formatCurrency = (value: number) =>
  `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatCountdown = (deadline: number | null, now: number) => {
  if (!deadline) return "24:00:00";
  const remainingMs = Math.max(deadline - now, 0);
  const totalSeconds = Math.floor(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600)
    .toString()
    .padStart(2, "0");
  const minutes = Math.floor((totalSeconds % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

const getMethodIcon = (method: DepositMethodOption) => {
  if (method.symbol === "MPESA") {
    return <img src="/images/mpesa-logo.png" alt="M-Pesa" className="h-8 w-auto max-w-[72px] object-contain" onError={(e) => { e.currentTarget.style.display="none"; }} />;
  }

  if (method.symbol === "AIRTEL") {
    return <img src="/images/airtel-logo.png" alt="Airtel Money" className="h-8 w-auto max-w-[72px] object-contain" onError={(e) => { e.currentTarget.style.display="none"; }} />;
  }

  if (method.iconType === "crypto") {
    return (
      <img
        src={getCryptoIcon(method.symbol)}
        alt={method.symbol}
        className="h-10 w-10 rounded-full bg-white object-cover"
        onError={(event) => {
          event.currentTarget.style.display = "none";
        }}
      />
    );
  }

  if (method.iconType === "wallet") {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300">
        <Wallet className="h-5 w-5" />
      </div>
    );
  }

  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1e2330] text-slate-200">
      <Building2 className="h-5 w-5" />
    </div>
  );
};

const getPreviewBadge = (label: string) => {
  const upperLabel = label.toUpperCase();
  const hasCryptoIcon = CRYPTO_ICON[upperLabel];

  if (hasCryptoIcon) {
    return (
      <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full bg-white/90 ring-1 ring-black/10">
        <img src={getCryptoIcon(upperLabel)} alt={upperLabel} className="h-6 w-6 rounded-full object-cover" />
      </span>
    );
  }

  return (
    <span className="rounded-full bg-black/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/85">
      {label}
    </span>
  );
};

const getGenericCryptoPreview = () => ["BTC", "ETH", "USDT", "BNB"];

const GenericCryptoMethodBadge = () => (
  <div className="flex items-center">
    {getGenericCryptoPreview().map((symbol, index) => (
      <span
        key={symbol}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-[#22364a] bg-white"
        style={{ marginLeft: index === 0 ? 0 : -8, zIndex: 10 - index }}
      >
        <img src={getCryptoIcon(symbol)} alt={symbol} className="h-7 w-7 rounded-full object-cover" />
      </span>
    ))}
  </div>
);

const DepositCategoryIcon = ({ category }: { category: DepositCategory }) => {
  if (category === "popular") return <Wallet className="h-5 w-5 fill-white text-white" />;
  if (category === "epay") return <CreditCard className="h-5 w-5 text-white" />;
  return <Building2 className="h-5 w-5 fill-white text-white" />;
};

const DepositCategoryCard = ({
  active,
  category,
  count,
  onClick,
  preview,
}: {
  active: boolean;
  category: DepositCategory;
  count: number;
  onClick: () => void;
  preview: string[];
}) => {
  const copy = CATEGORY_COPY[category];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-[92px] rounded-[6px] border px-5 py-4 text-left transition ${
        active
          ? "border-[#15b963] bg-[#13b65d] text-white shadow-[0_12px_28px_rgba(19,182,93,0.22)]"
          : "border-white/12 bg-[#343a4c] text-white hover:border-white/22 hover:bg-[#3a4054]"
      }`}
    >
      <div className="flex items-start gap-3">
        <DepositCategoryIcon category={category} />
        <div className="min-w-0">
          <div className="text-[15px] font-black uppercase leading-none">{copy.title}</div>
          <div className={`mt-2 text-[14px] font-bold ${active ? "text-white/45" : "text-white/35"}`}>{count} methods</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2 pl-8">
        {preview.slice(0, 4).map((entry) => (
          <span key={entry} className="scale-75 origin-left">
            {getPreviewBadge(entry)}
          </span>
        ))}
        {count > preview.length && (
          <span className="rounded-[5px] bg-white/15 px-2 py-1 text-[10px] font-black text-white">+{count - preview.length}</span>
        )}
      </div>
    </button>
  );
};

const DepositMethodRow = ({
  method,
  onClick,
  repeat,
}: {
  method: DepositMethodOption;
  onClick: () => void;
  repeat?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex h-[64px] min-w-0 items-center gap-3 rounded-[4px] bg-white px-4 text-left text-[#202638] transition hover:bg-slate-100 ${
      method.available ? "" : "opacity-60"
    }`}
>
    <span className="flex h-10 w-20 shrink-0 items-center justify-start overflow-visible">{getMethodIcon(method)}</span>
    <span className="min-w-0 flex-1">
      <span className="block truncate text-[14px] font-bold text-[#202638]">{method.name}</span>
      <span className="block text-[11px] font-bold text-slate-400">Min. {formatCurrency(method.minAmount)} · Max. {formatCurrency(method.maxAmount)}</span>
    </span>
    {repeat ? (
      <span className="rounded-[4px] bg-[#11ad5d] px-4 py-2 text-[12px] font-black text-white">Repeat</span>
    ) : (
      <ChevronRight className="h-5 w-5 text-slate-300" />
    )}
  </button>
);

export const DepositModal = ({ onClose }: { onClose: () => void }) => {
  const { t } = useTranslation();
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<DepositStep>("methods");
  const [activeCategory, setActiveCategory] = useState<DepositCategory>("crypto");
  const [amount, setAmount] = useState("100");
  const [bonusEnabled, setBonusEnabled] = useState(false);
  const [firstName, setFirstName] = useState(() => profile?.full_name?.split(" ")[0] ?? "");
  const [lastName, setLastName] = useState(() => profile?.full_name?.split(" ").slice(1).join(" ") ?? "");
  const [phone, setPhone] = useState(() => profile?.phone_number ?? "");
  const [cryptoMethods, setCryptoMethods] = useState<CryptoPaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [copiedField, setCopiedField] = useState<"amount" | "address" | "memo" | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [checkoutDeadline, setCheckoutDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [activeInstruction, setActiveInstruction] = useState<ActiveCryptoInstruction | null>(null);
  const [bonusCodeOpen, setBonusCodeOpen] = useState(false);
  const [bonusCode, setBonusCode] = useState("");
  const [activeDbPromos, setActiveDbPromos] = useState<Tables<"promo_codes">[]>([]);
  const [mpesaResult, setMpesaResult] = useState<MobileMoneyDepositPayload | null>(null);

  // Dynamic bonus from admin-configured offers
  const { loading: bonusLoading, cryptoEnabled, findMatchingOffer, bonusAmountFor } = useDepositBonus(user?.id ?? null);

  useEffect(() => {
    let cancelled = false;

    const fetchDepositData = async () => {
      setLoading(true);
      const [methodsResponse, promosResponse] = await Promise.all([
        api.from("crypto_payment_methods").select("*").eq("status", "active").order("coin_name"),
        api.from("promo_codes").select("*").eq("status", "active").order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;

      if (promosResponse.data) {
        setActiveDbPromos(promosResponse.data);
      }

      if (methodsResponse.error) {
        toast({
          title: t("accountModals.paymentMethodsUnavailable"),
          description: methodsResponse.error.message,
          variant: "destructive",
        });
      } else {
        const methods = [...(methodsResponse.data ?? [])].sort((left, right) => {
          const automationDiff = getCryptoAutomationPriority(left) - getCryptoAutomationPriority(right);
          if (automationDiff !== 0) return automationDiff;

          const priorityDiff = getCryptoPriority(left) - getCryptoPriority(right);
          if (priorityDiff !== 0) return priorityDiff;

          if (left.symbol.toUpperCase() === right.symbol.toUpperCase()) {
            const networkDiff = getNetworkRank(left.network) - getNetworkRank(right.network);
            if (networkDiff !== 0) return networkDiff;
          }

          return getCryptoMethodName(left).localeCompare(getCryptoMethodName(right));
        });
        const supportedMethods = methods.filter(
          (method) =>
            isAutomatedCryptoMode(method.attribution_mode) &&
            isPlisioSupportedCryptoMethod({ network: method.network, symbol: method.symbol }),
        );
        setCryptoMethods(methods);
        setSelectedMethodId((current) =>
          current && supportedMethods.some((entry) => entry.id === current)
            ? current
            : supportedMethods[0]?.id ?? "",
        );
      }

      setLoading(false);
    };

    fetchDepositData();

    return () => {
      cancelled = true;
    };
  }, []);

  const cryptoDepositMethods = useMemo<DepositMethodOption[]>(
    () =>
      [...cryptoMethods]
        .filter(
          (method) =>
            isAutomatedCryptoMode(method.attribution_mode) &&
            isPlisioSupportedCryptoMethod({ network: method.network, symbol: method.symbol }),
        )
        .sort((left, right) => {
          const automationDiff = getCryptoAutomationPriority(left) - getCryptoAutomationPriority(right);
          if (automationDiff !== 0) return automationDiff;

          const priorityDiff = getCryptoPriority(left) - getCryptoPriority(right);
          if (priorityDiff !== 0) return priorityDiff;

          if (left.symbol.toUpperCase() === right.symbol.toUpperCase()) {
            const networkDiff = getNetworkRank(left.network) - getNetworkRank(right.network);
            if (networkDiff !== 0) return networkDiff;
          }

          return getCryptoMethodName(left).localeCompare(getCryptoMethodName(right));
        })
        .map((method) => {
        const limits = getMethodLimits(method);
        return {
          attributionMode: method.attribution_mode,
          id: method.id,
          category: "crypto",
          confirmationsRequired: method.confirmations_required,
          name: getCryptoMethodName(method),
          memoLabel: method.memo_label,
          subtitle: `Min. ${formatCurrency(limits.minAmount)}`,
          symbol: method.symbol.toUpperCase(),
          network: method.network,
          minAmount: limits.minAmount,
          maxAmount: limits.maxAmount,
          available: true,
          iconType: "crypto",
          walletAddress: method.wallet_address,
          qrCodeUrl: method.qr_code_url,
        };
        }),
    [cryptoMethods],
  );

  const popularMethods = useMemo(() => cryptoDepositMethods.slice(0, 6), [cryptoDepositMethods]);

  const methodCatalog = useMemo(
    () => [...cryptoDepositMethods, ...STATIC_DEPOSIT_METHODS],
    [cryptoDepositMethods],
  );

  const methodSections = useMemo(() => {
    const epayMethods = STATIC_DEPOSIT_METHODS.filter((method) => method.category === "epay");

    if (activeCategory === "popular") {
      return [
        { id: "popular", title: `Popular in your region (${popularMethods.length})`, methods: popularMethods },
        { id: "epay", title: `E-Pay (${epayMethods.length})`, methods: epayMethods },
      ].filter((section) => section.methods.length > 0);
    }

    if (activeCategory === "crypto") {
      return [{ id: "crypto", title: `Crypto (${cryptoDepositMethods.length})`, methods: cryptoDepositMethods }];
    }

    if (activeCategory === "epay") {
      return [{ id: "epay", title: `E-Pay (${epayMethods.length})`, methods: epayMethods }];
    }

    return [];
  }, [activeCategory, cryptoDepositMethods, popularMethods]);

  const selectedMethod =
    methodCatalog.find((method) => method.id === selectedMethodId) ?? null;
  const selectedMethodIsAutomated = Boolean(
    selectedMethod?.category === "crypto" ||
      selectedMethod?.iconType === "crypto" ||
      (selectedMethod?.attributionMode && isAutomatedCryptoMode(selectedMethod.attributionMode)),
  );
  const activeInstructionIsPlisio = Boolean(activeInstruction && isPlisioInstructionAddress(activeInstruction.address));

  const headerSubtitle = step === "methods" ? t("accountModals.selectPaymentMethod") : "Complete the payment in Plisio";
  const amountValue = Number(amount) || 0;
  const activeMatchedPromo = useMemo(() => {
    if (!bonusEnabled || !bonusCode.trim()) return null;
    const cleanCode = bonusCode.trim().toUpperCase();
    return activeDbPromos.find((p) => p.code.toUpperCase() === cleanCode) ?? null;
  }, [activeDbPromos, bonusCode, bonusEnabled]);

  const matchingOffer = bonusEnabled && !bonusLoading ? findMatchingOffer(amountValue) : null;

  const resolvedBonusPercent = useMemo(() => {
    if (!bonusEnabled) return 0;
    if (activeMatchedPromo) {
      const val = parseFloat(activeMatchedPromo.reward_value);
      return Number.isFinite(val) ? val : 0;
    }
    return matchingOffer ? matchingOffer.bonus_percent : 0;
  }, [activeMatchedPromo, bonusEnabled, matchingOffer]);

  const bonusAmount = useMemo(() => {
    if (!bonusEnabled || amountValue <= 0 || resolvedBonusPercent <= 0) return 0;
    if (activeMatchedPromo) {
      const minDep = Number(
        activeMatchedPromo.minimum_deposit_amount ?? (
          activeMatchedPromo.code === "WELCOME50" ? 30 :
          activeMatchedPromo.code === "DEPOSIT50" ? 100 :
          activeMatchedPromo.code === "DEPOSIT40" ? 80 :
          activeMatchedPromo.code === "DEPOSIT30" ? 70 : 0
        ),
      );
      if (minDep > 0 && amountValue < minDep) return 0;
    }
    return Math.round(amountValue * (resolvedBonusPercent / 100) * 100) / 100;
  }, [activeMatchedPromo, amountValue, bonusEnabled, resolvedBonusPercent]);

  const receiveAmount = amountValue + bonusAmount;
  const depositToastClassName =
    "rounded-[24px] border-[#5ec893]/35 bg-[#245b47] px-5 py-4 pr-11 text-white shadow-[0_24px_50px_rgba(7,38,24,0.34)] backdrop-blur-md";

  const showDepositStatusToast = ({
    badge,
    description,
    icon: Icon,
    title,
    tone,
  }: {
    badge: string;
    description: string;
    icon: LucideIcon;
    title: string;
    tone: "failure" | "pending" | "success";
  }) => {
    const toneClasses =
      tone === "success"
        ? {
            badgeClassName: "border-emerald-200/35 bg-emerald-200/18 text-emerald-50",
            iconClassName: "bg-white/14 text-emerald-50",
          }
        : tone === "failure"
          ? {
              badgeClassName: "border-amber-100/35 bg-amber-100/18 text-amber-50",
              iconClassName: "bg-white/14 text-amber-50",
            }
          : {
              badgeClassName: "border-emerald-200/35 bg-emerald-200/18 text-emerald-50",
              iconClassName: "bg-white/14 text-emerald-50",
            };

    toast({
      title: (
        <div className="flex items-center gap-3 text-white">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${toneClasses.iconClassName}`}>
            <Icon className={`h-4 w-4 ${tone === "pending" ? "animate-pulse" : ""}`} />
          </span>
          <span className="text-[15px] font-semibold leading-none text-white">{title}</span>
          <span
            className={`ml-auto inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${toneClasses.badgeClassName}`}
          >
            {badge}
          </span>
        </div>
      ),
      description: <div className="pl-12 pr-1 text-[13px] leading-5 text-white/88">{description}</div>,
      variant: "funding",
      className: depositToastClassName,
    });
  };
  const bonusPresetOptions = useMemo(
    () => {
      const offers = matchingOffer ? [matchingOffer] : [];
      return offers.filter((offer) => offer.minimum_deposit_amount_resolved >= (selectedMethod?.minAmount ?? 0)).map((offer) => ({
        amount: offer.minimum_deposit_amount_resolved,
        percent: offer.bonus_percent,
        tier: offer,
      }));
    },
    [matchingOffer, selectedMethod?.minAmount],
  );
  const waitingStatusLabel =
    processing
      ? "Preparing payment..."
      : activeInstruction?.detected_tx_hash
        ? `Payment detected • ${activeInstruction.observed_confirmations}/${activeInstruction.confirmations_required} confirmations`
        : "Awaiting payment in Plisio...";
  const paymentWarnings = selectedMethod
    ? activeInstruction && !activeInstructionIsPlisio
      ? [
          {
            id: "legacy-monitoring",
            tone: "blue" as const,
            text: "This deposit was created on the previous gateway and is already being monitored for confirmations.",
          },
        ]
      : [
          ...(matchingOffer
            ? [
                {
                  id: "bonus-credit",
                  tone: "blue" as const,
                  text: `${matchingOffer.bonus_percent}% bonus is attached to this deposit and will credit automatically after the payment confirms.`,
                },
              ]
            : []),
          {
            id: "network",
            tone: "amber" as const,
            text: "Complete the hosted invoice using the supported cryptocurrency flow shown in Plisio.",
          },
          {
            id: "hosted-checkout",
            tone: "amber" as const,
            text: "Use only the current Plisio checkout session. Older hosted invoices can expire or be replaced.",
          },
          {
            id: "fees",
            tone: "blue" as const,
            text: "Network fees are handled in the hosted checkout. Return here after payment to monitor confirmations.",
          },
        ]
    : [];

  const amountError = useMemo(() => {
    if (!selectedMethod || amountValue <= 0) return "Enter a deposit amount to continue.";
    if (amountValue < selectedMethod.minAmount) {
      return `Minimum deposit for ${selectedMethod.name} is ${formatCurrency(selectedMethod.minAmount)}.`;
    }
    if (amountValue > selectedMethod.maxAmount) {
      return `Maximum deposit for ${selectedMethod.name} is ${formatCurrency(selectedMethod.maxAmount)}.`;
    }
    return null;
  }, [amountValue, selectedMethod]);

  useEffect(() => {
    let cancelled = false;

    const restoreActiveInstruction = async () => {
      if (!user?.id || !selectedMethod || !selectedMethodIsAutomated) {
        setActiveInstruction(null);
        return;
      }

      try {
        const openInstruction = await getLatestOpenCryptoDepositInstruction({
          paymentMethodId: selectedMethod.id,
          userId: user.id,
        });

        if (cancelled) {
          return;
        }

        if (!openInstruction) {
          setActiveInstruction(null);
          return;
        }

        const instruction = mapCryptoDepositInstructionRecordToPayload(openInstruction);

        setActiveInstruction(
          buildActiveCryptoInstruction({
            detectedTxHash: openInstruction.detected_tx_hash,
            instruction,
            observedConfirmations: Number(openInstruction.observed_confirmations ?? 0),
            paymentMethod: selectedMethod,
          }),
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("Failed to restore active crypto deposit instruction", error);
        setActiveInstruction(null);
      }
    };

    void restoreActiveInstruction();

    return () => {
      cancelled = true;
    };
  }, [selectedMethod?.id, selectedMethodIsAutomated, user?.id]);

  useEffect(() => {
    if (!activeInstruction) return;

    let didNotifyCredit = false;
    const channel = realtime
      .channel(`deposit-modal-instruction-${activeInstruction.instruction_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "crypto_deposit_instructions",
          filter: `id=eq.${activeInstruction.instruction_id}`,
        },
        (payload) => {
          const nextInstruction = payload.new as Tables<"crypto_deposit_instructions">;
          if (!nextInstruction?.id) return;

          setActiveInstruction((current) =>
            current
              ? {
                  ...current,
                  detected_tx_hash: nextInstruction.detected_tx_hash,
                  instruction_status: nextInstruction.instruction_status as ActiveCryptoInstruction["instruction_status"],
                  observed_confirmations: Number(nextInstruction.observed_confirmations ?? 0),
                }
              : current,
          );

          if (nextInstruction.instruction_status === "credited" && !didNotifyCredit) {
            didNotifyCredit = true;
            clearCryptoDepositCheckoutCache(nextInstruction.id);
            void refreshProfile();
            toast({
              title: t("accountModals.depositCredited"),
              description: "This crypto transfer reached the required confirmations and was credited automatically.",
            });
          }
        },
      )
      .subscribe();

    return () => {
      realtime.removeChannel(channel);
    };
  }, [activeInstruction, refreshProfile]);

  useEffect(() => {
    if (!activeInstruction) {
      return;
    }

    setBonusEnabled(Number(activeInstruction.promo_bonus ?? 0) > 0);
  }, [activeInstruction?.instruction_id, activeInstruction?.promo_bonus]);

  const openHostedCheckout = (checkoutUrl: string | null | undefined) => {
    if (!checkoutUrl) {
      toast({
        title: t("accountModals.checkoutLinkUnavailable"),
        description: "This deposit is active, but the Plisio invoice link is no longer available on this device.",
        variant: "destructive",
      });
      return;
    }

    window.location.assign(checkoutUrl);
  };

  const restoreHostedCheckout = async (instruction: ActiveCryptoInstruction) => {
    if (!isPlisioInstructionAddress(instruction.address)) {
      return null;
    }

    const restored = await recoverCryptoDepositCheckout({
      instructionId: instruction.instruction_id,
    });

    const nextInstruction = buildActiveCryptoInstruction({
      detectedTxHash: instruction.detected_tx_hash,
      instruction: restored,
      observedConfirmations: instruction.observed_confirmations,
      paymentMethod: instruction.paymentMethod,
    });
    setActiveInstruction(nextInstruction);
    return nextInstruction;
  };

const categoryCards = useMemo(
    () => [
      {
        id: "popular" as DepositCategory,
        count: popularMethods.length,
        preview: popularMethods.slice(0, 5).map((method) => method.symbol),
        available: popularMethods.length > 0,
      },
      {
        id: "epay" as DepositCategory,
        count: STATIC_DEPOSIT_METHODS.filter((method) => method.category === "epay").length,
        preview: ["M-Pesa", "Airtel"],
        available: STATIC_DEPOSIT_METHODS.some((method) => method.category === "epay" && method.available),
      },
      {
        id: "crypto" as DepositCategory,
        count: cryptoDepositMethods.length,
        preview: cryptoDepositMethods.slice(0, 5).map((method) => method.symbol),
        available: cryptoDepositMethods.length > 0,
      },
    ],
    [cryptoDepositMethods, popularMethods],
  );

  useEffect(() => {
    if (step !== "checkout") {
      setCheckoutDeadline(null);
      return;
    }

    const createdAt = activeInstruction?.created_at ? new Date(activeInstruction.created_at).getTime() : Number.NaN;

    setCheckoutDeadline(Number.isNaN(createdAt) ? Date.now() + CHECKOUT_WINDOW_MS : createdAt + CHECKOUT_WINDOW_MS);
    setNow(Date.now());
  }, [activeInstruction?.created_at, step]);

  useEffect(() => {
    if (step !== "checkout" || !checkoutDeadline) return;

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [checkoutDeadline, step]);

  const handleSelectCategory = (category: DepositCategory) => {
    setActiveCategory(category);
  };

  const handleSelectMethod = (method: DepositMethodOption) => {
    if (!method.available) {
      toast({
        title: t("accountModals.methodComingSoon", { method: method.name }),
        description: "Only one-time-address crypto deposits are live right now. More deposit channels can be enabled next.",
      });
      return;
    }

    setSelectedMethodId(method.id);
    setStep("checkout");
    setAmount((current) => {
      const numericAmount = Number(current);
      if (!Number.isFinite(numericAmount) || numericAmount < method.minAmount) {
        return String(method.minAmount);
      }

      if (numericAmount > method.maxAmount) {
        return String(method.maxAmount);
      }

      return current;
    });
  };

  const handleAdjustAmount = (direction: -1 | 1) => {
    if (!selectedMethod) {
      return;
    }

    const stepAmount = amountValue >= 300 ? 50 : amountValue >= 150 ? 25 : 10;
    const baseAmount = amountValue > 0 ? amountValue : selectedMethod.minAmount;
    const nextAmount = Math.min(
      selectedMethod.maxAmount,
      Math.max(selectedMethod.minAmount, baseAmount + stepAmount * direction),
    );

    setAmount(String(nextAmount));
  };

  const handleCopy = async (field: "amount" | "address" | "memo", value: string) => {
    const fieldLabel = field === "amount" ? "Amount" : field === "memo" ? "Memo" : "Address";

    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1800);
      toast({
        title: `${fieldLabel} copied`,
        description: `${fieldLabel} copied to clipboard.`,
      });
    } catch {
      toast({
        title: t("accountModals.copyFailed"),
        description: "Clipboard access is blocked in this browser.",
        variant: "destructive",
      });
    }
  };

  const handleProceedToCheckout = async () => {
    if (!selectedMethod) {
      toast({ title: t("accountModals.chooseMethodFirst"), variant: "destructive" });
      return;
    }

    if (!selectedMethod.available) {
      toast({
        title: t("accountModals.methodNotReady"),
        description: "Choose one of the enabled payment methods to continue.",
        variant: "destructive",
      });
      return;
    }

    if (amountError) {
      toast({ title: amountError, variant: "destructive" });
      return;
    }

    if (
      selectedMethodIsAutomated &&
      activeInstruction?.paymentMethod.id === selectedMethod.id &&
      Number(activeInstruction.amount) === amountValue &&
      Math.abs(Number(activeInstruction.promo_bonus ?? 0) - bonusAmount) < 0.01
    ) {
      if (activeInstruction.hosted_checkout_url) {
        openHostedCheckout(activeInstruction.hosted_checkout_url);
        return;
      }

      if (isPlisioInstructionAddress(activeInstruction.address)) {
        try {
          const restoredInstruction = await restoreHostedCheckout(activeInstruction);
          openHostedCheckout(restoredInstruction?.hosted_checkout_url);
        } catch (error) {
          toast({
            title: t("accountModals.restorePlisioFailed"),
            description: error instanceof Error ? error.message : t("accountModals.plisioRestoreFailedDesc"),
            variant: "destructive",
          });
        }
        return;
      }

      if (activeInstruction.detected_tx_hash) {
        setStep("checkout");
        return;
      }
    }

    if (!selectedMethodIsAutomated) {
      await handleConfirmDeposit();
      return;
    }

    if (selectedMethodIsAutomated) {
      setProcessing(true);

      try {
        const payload = await createCryptoDepositInstruction({
          amount: amountValue,
          applyDepositBonus: bonusEnabled,
          paymentMethodId: selectedMethod.id,
          cryptoCurrency: selectedMethod.symbol,
          cryptoNetwork: selectedMethod.network,
        });

        setActiveInstruction(
          buildActiveCryptoInstruction({
            instruction: payload,
            paymentMethod: selectedMethod,
          }),
        );

        if (payload.hosted_checkout_url) {
          openHostedCheckout(payload.hosted_checkout_url);
        }
      } catch (error) {
        toast({
          title: t("accountModals.plisioCheckoutUnavailable"),
          description: error instanceof Error ? error.message : "Something went wrong while reserving the hosted crypto invoice.",
          variant: "destructive",
        });
        setProcessing(false);
        return;
      } finally {
        setProcessing(false);
      }
    }

    setStep("checkout");
  };

  const handleConfirmDeposit = async () => {
    if (!user || !profile) {
      toast({
        title: t("accountModals.depositSignInRequired"),
        description: "Please sign in again before confirming this deposit.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedMethod || !selectedMethod.available) {
      toast({ title: t("accountModals.chooseMethodFirst"), variant: "destructive" });
      return;
    }

    if (amountError) {
      toast({ title: amountError, variant: "destructive" });
      return;
    }

    // ── M-Pesa / Airtel: trigger real SasaPay STK push ──
    if (selectedMethod.symbol === "MPESA" || selectedMethod.symbol === "AIRTEL") {
      if (!phone.trim()) {
        toast({ title: "Phone number required", description: "Enter your M-Pesa registered phone number.", variant: "destructive" });
        return;
      }

      setProcessing(true);
      try {
        const result = await requestMobileMoneyDeposit({
          amount: amountValue,
          bonusOfferId: null, // promo codes handled server-side via bonus offers
          phoneNumber: phone.trim(),
        });
        setMpesaResult(result);
      } catch (error) {
        showDepositStatusToast({
          title: "M-Pesa deposit failed",
          badge: "Action needed",
          description: error instanceof Error ? error.message : "Could not initiate M-Pesa STK push. Check your phone number and try again.",
          icon: ShieldAlert,
          tone: "failure",
        });
      } finally {
        setProcessing(false);
      }
      return;
    }

    setProcessing(true);
    try {
      const payload = await requestDepositReview({
        amount: amountValue,
        method: selectedMethod.symbol,
        paymentMethodId: selectedMethod.id,
      });

      await refreshProfile();

      const appliedPromoBonus = Number(payload.promo_bonus ?? 0);
      showDepositStatusToast({
        title: t("accountModals.depositSubmitted"),
        badge: "Pending review",
        description:
          appliedPromoBonus > 0
            ? `${formatCurrency(amountValue)} is now pending finance review. Bonus ${formatCurrency(appliedPromoBonus)} will apply after approval.`
            : `${formatCurrency(amountValue)} is now pending finance review.`,
        icon: Clock3,
        tone: "pending",
      });

      onClose();
    } catch (error) {
      showDepositStatusToast({
        title: t("accountModals.depositFailed"),
        badge: "Action needed",
        description: error instanceof Error ? error.message : "Something went wrong while confirming the deposit.",
        icon: ShieldAlert,
        tone: "failure",
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b101b]/78 p-4 backdrop-blur-[5px]">
      <div className="flex max-h-[calc(100dvh-32px)] w-full max-w-[905px] flex-col overflow-hidden rounded-[6px] bg-[#2b3142] px-8 py-7 text-white shadow-[0_32px_100px_rgba(0,0,0,0.58)]">
        <div className="flex items-center justify-between border-b border-dashed border-white/16 pb-6">
          <div className="flex items-center gap-3">
            {step === "checkout" && (
              <button
                type="button"
                onClick={() => setStep("methods")}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/16 hover:text-white"
                aria-label="Back to payment methods"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-[20px] font-black">Deposit</h2>
          </div>
          <button type="button" onClick={onClose} className="text-white/50 transition hover:text-white" aria-label="Close deposit">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pt-5 pr-1 deposit-scrollbar">
          {/* ── M-Pesa STK Push Sent Confirmation ── */}
          {mpesaResult && (
            <div className="flex flex-col items-center gap-6 py-8 text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[#0fa055]/15 ring-4 ring-[#0fa055]/20">
                <CheckCircle className="h-10 w-10 text-[#0fa055]" />
              </div>
              <div>
                <h3 className="text-[22px] font-black text-white">Check Your Phone!</h3>
                <p className="mt-1 text-[14px] font-medium text-white/60">
                  An M-Pesa STK push has been sent to
                </p>
                <p className="mt-1 text-[16px] font-black text-white">{mpesaResult.masked_phone_number}</p>
              </div>

              <div className="w-full max-w-[420px] rounded-[6px] border border-white/10 bg-[#1f2536] divide-y divide-white/10">
                <div className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-[13px] font-bold text-white/50">Amount (USD)</span>
                  <span className="text-[14px] font-black text-white">${mpesaResult.amount_usd?.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-3.5">
                  <span className="text-[13px] font-bold text-white/50">Amount (KES)</span>
                  <span className="text-[14px] font-black text-white">KES {mpesaResult.amount_kes?.toLocaleString()}</span>
                </div>
                {mpesaResult.customer_message && (
                  <div className="px-5 py-3.5">
                    <p className="text-[12px] font-medium text-white/60 text-left">{mpesaResult.customer_message}</p>
                  </div>
                )}
              </div>

              <div className="rounded-[6px] border border-amber-500/30 bg-amber-500/10 px-5 py-3.5 text-[13px] font-medium text-amber-200 max-w-[420px] w-full text-left">
                <strong className="font-black">Instructions:</strong> Enter your M-Pesa PIN on your phone when prompted. Your balance will be credited automatically once payment is confirmed.
              </div>

              <div className="flex w-full max-w-[420px] gap-3">
                <button
                  type="button"
                  onClick={() => { setMpesaResult(null); }}
                  className="flex-1 h-11 rounded-[4px] border border-white/20 text-[14px] font-bold text-white hover:bg-white/10 transition"
                >
                  Try Again
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-11 rounded-[4px] bg-[#0fa055] text-[14px] font-black text-white hover:bg-[#0d8a49] transition shadow-lg shadow-[#0fa055]/20"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {!mpesaResult && step === "methods" && (
            <div className="grid gap-5 lg:grid-cols-[262px_minmax(0,1fr)]">
              <div className="space-y-2">
                {categoryCards.map((category) => (
                  <DepositCategoryCard
                    key={category.id}
                    active={activeCategory === category.id}
                    category={category.id}
                    count={category.count}
                    preview={category.preview}
                    onClick={() => handleSelectCategory(category.id)}
                  />
                ))}
              </div>

              <div className="space-y-5">
                {loading ? (
                  <div className="flex min-h-[270px] items-center justify-center rounded-[6px] border border-dashed border-white/14 bg-black/10 px-6 text-white/70">
                    <div className="flex items-center gap-3">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      Loading payment methods...
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {methodSections.map((section) => (
                      <section key={section.id} className="space-y-3">
                        <h3 className="text-[16px] font-black text-white">{section.title}</h3>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {section.methods.map((method, index) => (
                            <DepositMethodRow
                              key={method.id}
                              method={method}
                              repeat={section.id === "popular" && index === 0}
                              onClick={() => handleSelectMethod(method)}
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
{!mpesaResult && step === "checkout" && selectedMethod && (
            <div className="grid gap-5 lg:grid-cols-[244px_minmax(0,1fr)]">
              <div className="flex flex-col justify-between rounded-[4px] bg-white p-5 text-[#202638] shadow-md">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="flex h-10 w-20 shrink-0 items-center justify-start overflow-visible">{getMethodIcon(selectedMethod)}</span>
                    <span className="text-[14px] font-bold leading-tight">{selectedMethod.name}</span>
                  </div>
                  <div className="my-6 border-t border-dashed border-slate-300" />
                  <div className="space-y-2 text-[13px] font-bold text-slate-400">
                    <div className="flex items-center justify-between">
                      <span>Min amount:</span>
                      <span className="text-slate-700 font-extrabold">{formatCurrency(selectedMethod.minAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Max amount:</span>
                      <span className="text-slate-700 font-extrabold">{formatCurrency(selectedMethod.maxAmount)}</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep("methods")}
                  className="mt-8 inline-flex items-center gap-2 text-[14px] font-bold text-[#0084FF] transition hover:text-[#0070df]"
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0084FF] text-white">
                    <ChevronLeft className="h-4 w-4" />
                  </span>
                  Change method
                </button>
              </div>

              <div className="min-w-0 space-y-4">
                {/* Alert banner */}
                <div className="flex items-center gap-2.5 rounded-[4px] bg-[#4a342f] border border-[#6b473f] px-3.5 py-3 text-[12px] font-bold text-white">
                  <AlertTriangle className="h-4 w-4 shrink-0 fill-[#ff9b25] text-[#ff9b25]" />
                  Minimum amount - {formatCurrency(selectedMethod.minAmount).replace(".00", "")}. Smaller payments won't be credited.
                </div>

                {/* Deposit Amount input */}
                <div className="relative">
                  <span className="absolute -top-2.5 left-3 z-10 bg-[#2b3142] px-1.5 text-[11px] font-bold text-white/50">Deposit amount</span>
                  <input
                    type="number"
                    min={selectedMethod.minAmount}
                    max={selectedMethod.maxAmount}
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="h-12 w-full rounded-[4px] border border-white/20 bg-transparent px-4 pr-10 text-[16px] font-bold text-white outline-none transition focus:border-[#0084FF]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[16px] font-bold text-white/60">$</span>
                </div>

                {/* Quick preset buttons */}
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {[150, 200, 300, 500].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(String(Math.max(preset, selectedMethod.minAmount)))}
                      className={`h-8 rounded-[4px] px-5 text-[12px] font-black transition ${
                        amountValue === preset ? "bg-[#596074] text-white ring-1 ring-white/20" : "bg-[#373e52] text-white hover:bg-[#434b63]"
                      }`}
                    >
                      {preset} $
                    </button>
                  ))}
                </div>

                {/* Bonus Code bar */}
                <div className="overflow-hidden rounded-[4px] border border-white/10 bg-[#1f2536]">
                  <button
                    type="button"
                    onClick={() => setBonusCodeOpen((current) => !current)}
                    className="flex h-12 w-full items-center justify-between px-4 text-left"
                  >
                    <span className="flex items-center gap-2.5 text-[14px] font-black text-white">
                      <span className="inline-flex h-4 w-5 items-center justify-center rounded-[2px] bg-[#ff5d58] text-[10px]">🎟️</span>
                      Bonus Code
                    </span>
                    <span className="flex items-center gap-2 text-[12px] font-black uppercase text-[#0084FF] hover:text-[#31a0ff]">
                      {bonusEnabled ? "ACTIVE ✓" : "ACTIVATE"}
                      <ChevronRight className={`h-4 w-4 transition ${bonusCodeOpen ? "rotate-90" : ""}`} />
                    </span>
                  </button>
                  {bonusCodeOpen && (
                    <div className="border-t border-white/10 px-4 pb-4 pt-3 space-y-3">
                      <div className="flex h-11 items-center overflow-hidden rounded-[4px] border border-white/30 bg-[#252b3d]">
                        <input
                          value={bonusCode}
                          onChange={(event) => setBonusCode(event.target.value)}
                          placeholder="Select or enter code"
                          className="min-w-0 flex-1 bg-transparent px-3.5 text-[14px] font-bold text-white outline-none placeholder:text-white/35"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!bonusCode.trim()) {
                              toast({ title: "Please select or enter a bonus code", variant: "destructive" });
                              return;
                            }
                            setBonusEnabled(true);
                            toast({ title: `Bonus code ${bonusCode} activated`, description: "The deposit bonus will be applied on settlement." });
                          }}
                          className="h-full px-5 text-[13px] font-bold bg-[#0084FF] text-white hover:bg-[#0070df] transition"
                        >
                          Apply
                        </button>
                      </div>

                      <div className="overflow-hidden rounded-[4px] bg-[#2a3040] border border-white/10">
                        {activeDbPromos.length === 0 ? (
                          <div className="p-3 text-[12px] font-bold text-white/50 text-center">
                            No active deposit bonus codes configured.
                          </div>
                        ) : (
                          activeDbPromos.map((promo) => {
                            const minDep = Number(
                              promo.minimum_deposit_amount ?? (
                                promo.code === "WELCOME50" ? 30 :
                                promo.code === "DEPOSIT50" ? 100 :
                                promo.code === "DEPOSIT40" ? 80 :
                                promo.code === "DEPOSIT30" ? 70 : 0
                              ),
                            );
                            const isSelected = bonusCode.toUpperCase() === promo.code.toUpperCase() && bonusEnabled;
                            return (
                              <button
                                key={promo.id}
                                type="button"
                                onClick={() => {
                                  setBonusCode(promo.code);
                                  setBonusEnabled(true);
                                  if (minDep > 0) {
                                    setAmount((current) => String(Math.max(Number(current) || 0, minDep)));
                                  }
                                  toast({
                                    title: `Bonus Code ${promo.code} Applied`,
                                    description: `+${promo.reward_value} bonus applied for deposits >= $${minDep}!`,
                                  });
                                }}
                                className={`block w-full border-b border-white/10 px-4 py-3 text-left transition last:border-b-0 hover:bg-white/12 ${
                                  isSelected ? "bg-[#0084FF]/25 border-l-4 border-l-[#0084FF]" : ""
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono font-black text-[#00C98D] text-[13px] tracking-wider">
                                    {promo.code}
                                  </span>
                                  <span className="rounded bg-[#00C98D]/20 px-2 py-0.5 text-[10px] font-bold text-[#00C98D]">
                                    +{promo.reward_value} BONUS
                                  </span>
                                </div>
                                <span className="mt-1 block text-[11px] font-medium text-white/80">
                                  +{promo.reward_value} bonus if you deposit more than ${minDep.toFixed(2)}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>

                      {bonusEnabled && (
                        <button
                          type="button"
                          onClick={() => {
                            setBonusEnabled(false);
                            setBonusCode("");
                            toast({ title: "Bonus removed", description: "Deposit will proceed without any bonus." });
                          }}
                          className="text-[11px] font-bold text-red-400 hover:text-red-300 underline block"
                        >
                          Remove active bonus
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Floating label inputs for First Name, Last Name, Phone (ONLY for M-Pesa / E-Pay) */}
                {(selectedMethod.category === "epay" || selectedMethod.symbol === "MPESA" || selectedMethod.symbol === "AIRTEL") && (
                  <div className="space-y-4 pt-1">
                    <div className="relative">
                      <span className="absolute -top-2.5 left-3 z-10 bg-[#2b3142] px-1.5 text-[11px] font-bold text-white/50">First name</span>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        className="h-12 w-full rounded-[4px] border border-white/20 bg-transparent px-4 text-[15px] font-bold text-white outline-none transition focus:border-[#0084FF]"
                      />
                    </div>

                    <div className="relative">
                      <span className="absolute -top-2.5 left-3 z-10 bg-[#2b3142] px-1.5 text-[11px] font-bold text-white/50">Last name</span>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        className="h-12 w-full rounded-[4px] border border-white/20 bg-transparent px-4 text-[15px] font-bold text-white outline-none transition focus:border-[#0084FF]"
                      />
                    </div>

                    <div className="relative">
                      <span className="absolute -top-2.5 left-3 z-10 bg-[#2b3142] px-1.5 text-[11px] font-bold text-white/50">Phone</span>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="254XXXXXXXXX"
                        className="h-12 w-full rounded-[4px] border border-white/20 bg-transparent px-4 text-[15px] font-bold text-white outline-none transition focus:border-[#0084FF]"
                      />
                    </div>
                  </div>
                )}

                {/* Receive Summary line */}
                <div className="flex items-center gap-2 pt-2 text-[14px] font-black text-white/40">
                  <span>You will receive</span>
                  <span className="h-px flex-1 border-t border-dashed border-white/18" />
                  <span className="text-white font-extrabold">{formatCurrency(receiveAmount)}</span>
                </div>

                {activeInstruction?.provider_payment_id && (
                  <div className="rounded-[4px] border border-white/10 bg-[#202637] px-4 py-3 text-[12px] font-bold text-white/70">
                    Plisio payment ID: <span className="break-all text-white">{activeInstruction.provider_payment_id}</span>
                  </div>
                )}

                {activeInstruction?.detected_tx_hash && (
                  <div className="rounded-[4px] border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-[13px] font-bold text-emerald-100">
                    Transaction detected: {activeInstruction.detected_tx_hash}
                  </div>
                )}

                {/* Submit Action button */}
                <button
                  type="button"
                  disabled={loading || processing || !selectedMethod || Boolean(amountError)}
                  onClick={() => void handleProceedToCheckout()}
                  className="h-12 w-full rounded-[4px] bg-[#0084FF] text-[16px] font-black text-white shadow-lg shadow-[#0084FF]/25 transition hover:bg-[#0070df] active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-white/50"
                >
                  {processing
                    ? "Preparing payment..."
                    : selectedMethodIsAutomated && activeInstructionIsPlisio
                      ? activeInstruction?.hosted_checkout_url
                        ? "Continue to Pay"
                        : "Restore Payment"
                      : "Proceed to Pay"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const WithdrawalModal = ({ balance, onClose }: { balance: number; onClose: () => void }) => {
  const { t } = useTranslation();
  const { user, profile, refreshProfile } = useAuth();
  const { formatMoney } = useCurrency();
  const navigate = useNavigate();

  const [amount, setAmount] = useState("10");
  const [firstName, setFirstName] = useState(() => profile?.full_name?.split(" ")[0] ?? "");
  const [lastName, setLastName] = useState(() => profile?.full_name?.split(" ").slice(1).join(" ") ?? "");
  const [bankName, setBankName] = useState("SAFARICOM");
  const [phone, setPhone] = useState(() => profile?.phone_number ?? "");
  const [walletAddress, setWalletAddress] = useState("");
  const [cryptoMemo, setCryptoMemo] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const [userDeposits, setUserDeposits] = useState<Tables<"deposit_requests">[]>([]);
  const [userWithdrawals, setUserWithdrawals] = useState<Tables<"withdrawals">[]>([]);
  const [cryptoMethods, setCryptoMethods] = useState<CryptoPaymentMethod[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const loadData = async () => {
      const [depositsRes, withdrawalsRes, cryptoRes] = await Promise.all([
        api.from("deposit_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        api.from("withdrawals").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        api.from("crypto_payment_methods").select("*").eq("status", "active").order("coin_name"),
      ]);

      if (cancelled) return;

      if (depositsRes.data) setUserDeposits(depositsRes.data);
      if (withdrawalsRes.data) setUserWithdrawals(withdrawalsRes.data);
      if (cryptoRes.data) setCryptoMethods(cryptoRes.data);
    };

    void loadData();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Derive eligible withdrawal methods strictly from user deposit history
  const eligibleMethods = useMemo<EligibleWithdrawalMethod[]>(() => {
    const map = new Map<string, EligibleWithdrawalMethod>();

    userDeposits.forEach((dep) => {
      const methodStr = (dep.method || "").toUpperCase();
      if (methodStr.includes("MPESA") || methodStr.includes("M-PESA") || methodStr.includes("MOBILE MONEY")) {
        map.set("mpesa", { id: "mpesa", label: "M-Pesa", methodType: "mpesa" });
      } else if (methodStr.includes("AIRTEL")) {
        map.set("airtel", { id: "airtel", label: "Airtel Money", methodType: "mpesa" });
      } else if (methodStr.includes("CRYPTO") || methodStr.includes("USDT") || methodStr.includes("BTC") || methodStr.includes("ETH")) {
        const cleanLabel = dep.method ? dep.method.replace(/^CRYPTO\s*/i, "") : "Cryptocurrency";
        const id = `crypto:${cleanLabel}`;
        map.set(id, { id, label: cleanLabel, methodType: "crypto", symbol: cleanLabel.split(" ")[0] });
      }
    });

    if (map.size === 0) {
      return [
        { id: "mpesa", label: "M-Pesa", methodType: "mpesa" },
        { id: "crypto:USDT (TRC-20)", label: "USDT (TRC-20)", methodType: "crypto", symbol: "USDT" },
      ];
    }

    return Array.from(map.values());
  }, [userDeposits]);

  useEffect(() => {
    if (eligibleMethods.length > 0 && !selectedMethodId) {
      setSelectedMethodId(eligibleMethods[0].id);
    }
  }, [eligibleMethods, selectedMethodId]);

  const selectedEligibleMethod = useMemo(
    () => eligibleMethods.find((m) => m.id === selectedMethodId) ?? eligibleMethods[0],
    [eligibleMethods, selectedMethodId],
  );

  const amountValue = Number(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (amountValue < 10) {
      toast({ title: t("accountModals.withdrawalMinAmount"), variant: "destructive" });
      return;
    }

    if (amountValue > balance) {
      toast({
        title: t("accountModals.withdrawalInsufficientFunds"),
        description: `Your live balance is ${formatCurrency(balance)}.`,
        variant: "destructive",
      });
      return;
    }

    if (selectedEligibleMethod?.methodType === "mpesa" && !phone.trim()) {
      toast({ title: t("accountModals.enterMpesaNumber"), variant: "destructive" });
      return;
    }

    if (selectedEligibleMethod?.methodType === "crypto" && !walletAddress.trim()) {
      toast({ title: t("accountModals.enterWalletAddress"), variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      if (selectedEligibleMethod?.methodType === "mpesa") {
        const payoutResponse = await requestMobileMoneyWithdrawal({
          amount: amountValue,
          phoneNumber: phone.trim(),
        });

        await refreshProfile();
        toast({
          title: payoutResponse.status === "pending" ? t("accountModals.withdrawalAwaitingApproval") : t("accountModals.withdrawalRequestReceived"),
          description: payoutResponse.detail || `${formatCurrencyAmount(payoutResponse.amount_kes, "KES")} is queued for ${payoutResponse.masked_phone_number}.`,
        });
        onClose();
        return;
      }

      const matchingCrypto = cryptoMethods.find(
        (c) => c.symbol.toUpperCase() === (selectedEligibleMethod?.symbol || "USDT").toUpperCase(),
      ) ?? cryptoMethods[0];

      await requestCryptoWithdrawal({
        amount: amountValue,
        destination: walletAddress.trim(),
        cryptoCurrency: matchingCrypto?.symbol || "USDT",
        cryptoNetwork: matchingCrypto?.network || "TRC-20",
        cryptoMemo: cryptoMemo.trim() || undefined,
      });

      await refreshProfile();
      toast({
        title: t("accountModals.withdrawalSubmitted"),
        description: `${formatCurrency(amountValue)} is now pending admin review.`,
      });
      onClose();
    } catch (error) {
      toast({
        title: t("accountModals.withdrawalFailed"),
        description: error instanceof Error ? error.message : "Something went wrong while submitting the withdrawal request.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b101b]/85 p-4 backdrop-blur-md">
      <div className="flex max-h-[calc(100dvh-32px)] w-full max-w-[1200px] flex-col overflow-hidden rounded-[8px] bg-[#161c28] text-white shadow-[0_32px_100px_rgba(0,0,0,0.7)]">
        {/* Top Header Navigation Bar */}
        <div className="flex items-center justify-between border-b border-[#263043] bg-[#1a2130] px-6 py-3">
          <div className="flex items-center gap-1 overflow-x-auto text-xs font-bold">
            <span className="border-b-2 border-[#0084FF] bg-[#222b3d] px-4 py-2 text-white">
              Withdrawal
            </span>
            <span className="px-4 py-2 text-gray-400">Payments</span>
            <span className="px-4 py-2 text-gray-400">Trades</span>
            <span className="px-4 py-2 text-gray-400">My Account</span>
            <span className="px-4 py-2 text-gray-400">Market</span>
            <span className="px-4 py-2 text-gray-400">Tournaments</span>
            <span className="px-4 py-2 text-gray-400">Analytics</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition" aria-label="Close withdrawal">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-6 space-y-8 deposit-scrollbar">
          {userDeposits.length === 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs font-medium text-amber-200">
              <Lock className="h-4 w-4 shrink-0 text-amber-400" />
              <span>
                <strong>Deposit History Notice:</strong> Withdrawal options are restricted to payment methods previously used for deposits. Please make a deposit first to unlock additional payout channels.
              </span>
            </div>
          )}

          {/* 3-Column Layout */}
          <form onSubmit={handleSubmit} className="grid gap-8 lg:grid-cols-[200px_minmax(0,1fr)_340px]">
            {/* Column 1: Account Info */}
            <div className="space-y-5">
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Account:</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-bold text-gray-400">In the account:</p>
                  <p className="text-xl font-black text-white">{formatCurrency(balance)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400">Available for withdrawal:</p>
                  <p className="text-xl font-black text-white">{formatCurrency(balance)}</p>
                </div>
              </div>
            </div>

            {/* Column 2: Withdrawal Inputs */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-white">Withdrawal:</h3>

              <div className="grid gap-4 sm:grid-cols-2">
                {/* Amount */}
                <div className="relative">
                  <span className="absolute -top-2.5 left-3 z-10 bg-[#161c28] px-1.5 text-[11px] font-bold text-white/50">Amount</span>
                  <input
                    type="number"
                    min={10}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-11 w-full rounded-[4px] border border-[#2b3548] bg-transparent px-4 pr-12 text-sm font-bold text-white outline-none focus:border-[#0084FF]"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-400">USD</span>
                </div>

                {/* Payment method dropdown (restricted to deposit history) */}
                <div className="relative">
                  <span className="absolute -top-2.5 left-3 z-10 bg-[#161c28] px-1.5 text-[11px] font-bold text-white/50">Payment method</span>
                  <select
                    value={selectedMethodId}
                    onChange={(e) => setSelectedMethodId(e.target.value)}
                    className="h-11 w-full rounded-[4px] border border-[#2b3548] bg-[#161c28] px-4 text-xs font-bold text-white outline-none focus:border-[#0084FF]"
                  >
                    {eligibleMethods.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Payout Inputs */}
              {selectedEligibleMethod?.methodType === "mpesa" ? (
                <div className="space-y-3.5">
                  <div className="relative">
                    <span className="absolute -top-2.5 left-3 z-10 bg-[#161c28] px-1.5 text-[11px] font-bold text-white/50">First name</span>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="h-11 w-full rounded-[4px] border border-[#2b3548] bg-transparent px-4 text-xs font-bold text-white outline-none focus:border-[#0084FF]"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute -top-2.5 left-3 z-10 bg-[#161c28] px-1.5 text-[11px] font-bold text-white/50">Last name</span>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="h-11 w-full rounded-[4px] border border-[#2b3548] bg-transparent px-4 text-xs font-bold text-white outline-none focus:border-[#0084FF]"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute -top-2.5 left-3 z-10 bg-[#161c28] px-1.5 text-[11px] font-bold text-white/50">Bank</span>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="h-11 w-full rounded-[4px] border border-[#2b3548] bg-[#161c28] px-4 text-xs font-bold text-white outline-none focus:border-[#0084FF]"
                    >
                      <option value="SAFARICOM">SAFARICOM</option>
                      <option value="AIRTEL">AIRTEL MONEY</option>
                    </select>
                  </div>
                  <div className="relative">
                    <span className="absolute -top-2.5 left-3 z-10 bg-[#161c28] px-1.5 text-[11px] font-bold text-white/50">Phone</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="2547XXXXXXXX"
                      className="h-11 w-full rounded-[4px] border border-[#2b3548] bg-transparent px-4 text-xs font-bold text-white outline-none focus:border-[#0084FF]"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div className="relative">
                    <span className="absolute -top-2.5 left-3 z-10 bg-[#161c28] px-1.5 text-[11px] font-bold text-white/50">Wallet address</span>
                    <input
                      type="text"
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="Enter wallet address"
                      className="h-11 w-full rounded-[4px] border border-[#2b3548] bg-transparent px-4 text-xs font-bold text-white outline-none focus:border-[#0084FF]"
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute -top-2.5 left-3 z-10 bg-[#161c28] px-1.5 text-[11px] font-bold text-white/50">Memo (optional)</span>
                    <input
                      type="text"
                      value={cryptoMemo}
                      onChange={(e) => setCryptoMemo(e.target.value)}
                      placeholder="Destination memo / tag if required"
                      className="h-11 w-full rounded-[4px] border border-[#2b3548] bg-transparent px-4 text-xs font-bold text-white outline-none focus:border-[#0084FF]"
                    />
                  </div>
                </div>
              )}

              {/* Confirm Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-11 w-[150px] items-center justify-center gap-2 rounded-[4px] bg-[#0084FF] px-5 text-xs font-black text-white shadow-md shadow-[#0084FF]/25 transition hover:bg-[#0070df] active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? "Confirming..." : "Confirm"} <ChevronRight size={14} />
              </button>
            </div>

            {/* Column 3: FAQ */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-[#8d99ae]">FAQ:</h3>
                <span onClick={() => { onClose(); navigate("/withdraw"); }} className="flex items-center gap-1 text-[11px] font-bold text-[#0084FF] cursor-pointer hover:underline">
                  Check out full FAQ <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0084FF] text-[9px] text-white">&gt;</span>
                </span>
              </div>
              <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 text-xs font-bold text-gray-300">
                <div className="space-y-3">
                  {FAQ_ITEMS.slice(0, 5).map((item, idx) => (
                    <div key={idx}>
                      <button
                        type="button"
                        onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                        className="flex items-start gap-1.5 text-left text-xs font-bold text-gray-300 hover:text-white transition"
                      >
                        <span className="text-gray-500">˅</span>
                        <span>{item.question}</span>
                      </button>
                      {expandedFaq === idx && (
                        <p className="mt-1 pl-4 text-[11px] font-normal leading-relaxed text-gray-400">
                          {item.answer}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {FAQ_ITEMS.slice(5).map((item, idx) => (
                    <div key={idx + 5}>
                      <button
                        type="button"
                        onClick={() => setExpandedFaq(expandedFaq === idx + 5 ? null : idx + 5)}
                        className="flex items-start gap-1.5 text-left text-xs font-bold text-gray-300 hover:text-white transition"
                      >
                        <span className="text-gray-500">˅</span>
                        <span>{item.question}</span>
                      </button>
                      {expandedFaq === idx + 5 && (
                        <p className="mt-1 pl-4 text-[11px] font-normal leading-relaxed text-gray-400">
                          {item.answer}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </form>

          {/* Bottom Financial History */}
          <div className="space-y-3 border-t border-dashed border-[#2b3548] pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-300">Some of your latest requests:</h3>
              <span onClick={() => { onClose(); navigate("/withdraw"); }} className="flex items-center gap-1 text-[11px] font-bold text-[#0084FF] cursor-pointer hover:underline">
                All financial history <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#0084FF] text-[9px] text-white">&gt;</span>
              </span>
            </div>

            <div className="space-y-2 text-xs font-bold">
              <div className="flex items-center justify-between py-2 border-b border-[#252e40] text-gray-400">
                <div className="flex items-center gap-8">
                  <span className="font-mono text-gray-300">128420243</span>
                  <span>25.08.2026 00:58:40</span>
                  <span className="flex items-center gap-1.5 text-gray-300">
                    <span className="h-2 w-2 rounded-full bg-slate-400" /> Waiting confirmation
                  </span>
                </div>
                <div className="flex items-center gap-12">
                  <span className="text-gray-300">M-pesa</span>
                  <span className="font-mono text-[#0fa055]">+100.00 $</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-[#252e40] text-gray-400">
                <div className="flex items-center gap-8">
                  <span className="font-mono text-gray-300">127990226</span>
                  <span>20.08.2026 06:20:02</span>
                  <span className="flex items-center gap-1.5 text-red-400">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> Failed
                  </span>
                </div>
                <div className="flex items-center gap-12">
                  <span className="text-gray-300">M-pesa</span>
                  <span className="font-mono text-[#0fa055]">+100.00 $</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 text-gray-400">
                <div className="flex items-center gap-8">
                  <span className="font-mono text-gray-300">127990195</span>
                  <span>20.08.2026 06:19:41</span>
                  <span className="flex items-center gap-1.5 text-red-400">
                    <span className="h-2 w-2 rounded-full bg-red-500" /> Failed
                  </span>
                </div>
                <div className="flex items-center gap-12">
                  <span className="text-gray-300">USDT (TRC-20)</span>
                  <span className="font-mono text-[#0fa055]">+100.00 $</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const RealAccountWelcomeModal = ({
  onClose,
  onDeposit,
  onWithdraw,
  onUseDemo,
}: {
  onClose: () => void;
  onDeposit: () => void;
  onWithdraw: () => void;
  onUseDemo: () => void;
}) => {
  const { t } = useTranslation();
  const stackLayers = [
    { translateX: -14, translateY: 32, scale: 0.86, opacity: 0.46 },
    { translateX: -6, translateY: 18, scale: 0.93, opacity: 0.62 },
    { translateX: 2, translateY: 0, scale: 1, opacity: 1 },
  ];

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-[#03060d]/82 p-2 backdrop-blur-[3px] sm:p-4">
      <div
        className="relative w-full max-w-[330px] overflow-hidden rounded-[20px] border shadow-[0_35px_100px_rgba(8,18,40,0.62)] sm:max-w-[410px] sm:rounded-[26px]"
        style={{
          background:
            "linear-gradient(180deg, rgba(50,63,99,0.98) 0%, rgba(42,53,84,0.98) 100%)",
          borderColor: "rgba(173, 205, 255, 0.18)",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(106,180,255,0.28),transparent_42%)]" />
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full text-[#a7b8db] transition hover:bg-white/5 hover:text-white sm:right-4 sm:top-4 sm:h-9 sm:w-9"
          aria-label="Close welcome modal"
        >
          <X className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        <div className="relative px-4 pb-5 pt-5 sm:px-6 sm:pb-8 sm:pt-7">
          <div className="mx-auto mb-3 h-[132px] w-full max-w-[176px] sm:mb-5 sm:h-[258px] sm:max-w-[296px]">
            <div className="relative h-full w-full">
              <div className="absolute left-1/2 top-5 h-16 w-16 -translate-x-1/2 rounded-full bg-[#5dc2ff]/25 blur-2xl sm:top-10 sm:h-28 sm:w-28 sm:blur-3xl" />
              <div className="absolute left-1/2 top-[38px] h-[66px] w-[66px] -translate-x-1/2 rounded-full border border-white/12 bg-white/5 backdrop-blur-sm sm:top-[74px] sm:h-[118px] sm:w-[118px]" />
              <div className="absolute left-1/2 top-[54px] flex h-[36px] w-[36px] -translate-x-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 shadow-[0_8px_24px_rgba(70,150,255,0.28)] sm:top-[104px] sm:h-[60px] sm:w-[60px]">
                <Wallet className="h-4 w-4 text-[#edf5ff] sm:h-7 sm:w-7" />
              </div>

              <div className="absolute left-1/2 bottom-0 h-[48px] w-[144px] -translate-x-1/2 rounded-full border border-[#7db5ff]/14 bg-[radial-gradient(circle_at_center,rgba(86,164,255,0.72),rgba(54,112,211,0.34)_52%,rgba(32,55,110,0.08)_74%,transparent_80%)] shadow-[0_18px_50px_rgba(44,119,236,0.35)] sm:bottom-1 sm:h-[84px] sm:w-[236px]" />
              <div className="absolute left-1/2 bottom-[7px] h-[31px] w-[130px] -translate-x-1/2 rounded-full border border-white/6 sm:bottom-[12px] sm:h-[56px] sm:w-[214px]" />
              <div className="absolute left-1/2 bottom-[14px] h-[74px] w-[112px] -translate-x-1/2 sm:bottom-[26px] sm:h-[138px] sm:w-[190px]">
                {stackLayers.map((layer, index) => (
                  <div
                    key={index}
                    className="real-account-wallet-layer absolute left-1/2 top-0"
                    style={{
                      "--wallet-layer-mobile-transform": `translate(calc(-50% + ${layer.translateX * 0.56}px), ${layer.translateY * 0.56}px) scale(${layer.scale})`,
                      "--wallet-layer-desktop-transform": `translate(calc(-50% + ${layer.translateX}px), ${layer.translateY}px) scale(${layer.scale})`,
                      opacity: layer.opacity,
                    } as React.CSSProperties}
                  >
                    <div
                      className="relative h-[36px] w-[98px] rounded-[10px] border sm:h-[62px] sm:w-[170px] sm:rounded-[16px]"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(224,242,255,0.94) 0%, rgba(148,213,255,0.92) 36%, rgba(78,171,255,0.48) 100%)",
                        borderColor: "rgba(240,248,255,0.45)",
                        boxShadow: "0 12px 24px rgba(55, 136, 237, 0.24)",
                      }}
                    >
                      <div className="absolute inset-x-0 top-0 h-2 rounded-t-[10px] bg-white/55 sm:h-3 sm:rounded-t-[16px]" />
                      <div className="absolute inset-y-[6px] left-2.5 right-[31px] rounded-[7px] border border-white/50 bg-[linear-gradient(180deg,rgba(240,250,255,0.95),rgba(162,222,255,0.55))] sm:inset-y-[10px] sm:left-4 sm:right-[52px] sm:rounded-[10px]" />
                      <div className="absolute inset-y-0 right-[26px] w-[20px] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(205,225,255,0.78))] sm:right-[44px] sm:w-[34px]" />
                      <div className="absolute inset-y-0 right-[32px] w-[1px] bg-[#9ac7ff] sm:right-[55px] sm:w-[2px]" />
                      <div className="absolute inset-y-0 right-[38px] w-[1px] bg-[#9ac7ff] sm:right-[66px] sm:w-[2px]" />
                      <div className="absolute left-4 top-[11px] h-[4px] w-[34px] rounded-full bg-[#cbe8ff] sm:left-7 sm:top-[19px] sm:h-[7px] sm:w-[58px]" />
                      <div className="absolute left-4 top-[18px] h-[3px] w-[24px] rounded-full bg-[#89caff] sm:left-7 sm:top-[31px] sm:h-[5px] sm:w-[40px]" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="absolute left-[12px] top-[31px] h-3 w-[2px] rotate-[-20deg] rounded-full bg-[#7bd0ff] shadow-[0_0_10px_rgba(123,208,255,0.8)] sm:left-[18px] sm:top-[58px] sm:h-5" />
              <div className="absolute left-[20px] top-[60px] h-2 w-2 rounded-full bg-[#80cfff]/65 blur-[1px] sm:left-[34px] sm:top-[112px] sm:h-3 sm:w-3" />
              <div className="absolute left-[14px] top-[78px] h-4 w-[2px] rotate-[24deg] rounded-full bg-[#7bd0ff] shadow-[0_0_10px_rgba(123,208,255,0.7)] sm:left-[22px] sm:top-[148px] sm:h-6" />
              <div className="absolute right-[16px] top-[27px] h-4 w-[2px] rotate-[26deg] rounded-full bg-[#7bd0ff] shadow-[0_0_10px_rgba(123,208,255,0.8)] sm:right-[26px] sm:top-[50px] sm:h-7" />
              <div className="absolute right-[8px] top-[68px] h-2.5 w-2.5 rounded-full bg-[#80cfff]/60 blur-[1px] sm:right-[14px] sm:top-[128px] sm:h-4 sm:w-4" />
              <div className="absolute right-[22px] top-[84px] h-3.5 w-[2px] rotate-[-22deg] rounded-full bg-[#7bd0ff] shadow-[0_0_10px_rgba(123,208,255,0.75)] sm:right-[36px] sm:top-[160px] sm:h-5" />
            </div>
          </div>

          <h2 className="text-center text-[17px] font-bold leading-snug text-white sm:text-[24px]">
            Choose what you want to do first
          </h2>
          <p className="mx-auto mt-2 max-w-[250px] text-center text-[13px] font-medium leading-6 text-[#dce9ff] sm:mt-4 sm:max-w-[300px] sm:text-[17px] sm:leading-8">
            Fund the live account, request a withdrawal, or keep practicing with a demo balance.
          </p>

          <div className="mt-4 space-y-2.5 sm:mt-8 sm:space-y-3">
            <button
              onClick={onWithdraw}
              className="w-full rounded-[11px] border px-4 py-2.5 text-[14px] font-semibold text-[#eef4ff] transition hover:bg-white/10 sm:rounded-[14px] sm:px-5 sm:py-3.5 sm:text-[17px]"
              style={{
                background: "rgba(79, 94, 136, 0.72)",
                borderColor: "rgba(155, 183, 236, 0.18)",
              }}
            >
              {t("accountModals.withdrawalTitle")}
            </button>
            <button
              onClick={onDeposit}
              className="w-full rounded-[11px] px-4 py-2.5 text-[14px] font-semibold text-white transition hover:brightness-105 sm:rounded-[14px] sm:px-5 sm:py-3.5 sm:text-[17px]"
              style={{
                background: "linear-gradient(180deg, #47adff 0%, #3397ef 100%)",
                boxShadow: "0 14px 30px rgba(52, 140, 236, 0.32)",
              }}
            >
              {t("accountModals.depositTitle")}
            </button>
          </div>

          <button
            onClick={onUseDemo}
            className="mt-4 w-full text-center text-[12px] font-medium text-[#55b7ff] transition hover:text-[#86cbff] sm:mt-6 sm:text-[15px]"
          >
            {t("accountModals.demoAccountLabel")}
          </button>
        </div>
      </div>
    </div>
  );
};

const DemoBalanceModal = ({
  isOpen,
  currentValue,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  currentValue: number;
  onClose: () => void;
  onSave: (value: number) => void;
}) => {
  const { t } = useTranslation();
  const [value, setValue] = useState(String(Math.round(currentValue)));

  useEffect(() => {
    if (!isOpen) return;
    setValue(String(Math.round(currentValue)));
  }, [currentValue, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[420px] rounded-[22px] border border-white/10 bg-[#242a39] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-[22px] font-bold text-white">Edit demo balance</h3>

          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full text-[#93a3bf] transition-colors hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 rounded-[14px] border border-[#4b5b77] bg-[#1f2738] px-4 py-3">
          <div className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#7f8ea8]">Demo amount</div>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-[24px] font-bold text-white">$</span>
            <input
              type="number"
              min="1"
              step="1"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="w-full bg-transparent text-[28px] font-bold text-white outline-none placeholder:text-[#56647d]"
              placeholder="10000"
            />
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {[1000, 5000, 10000].map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setValue(String(amount))}
              className="rounded-[10px] border border-white/10 bg-white/5 px-4 py-2.5 text-[13px] font-semibold text-[#dce4f5] transition-colors hover:bg-white/10"
            >
              ${amount.toLocaleString()}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            className="h-[52px] rounded-[12px] border border-white/10 bg-white/5 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
          >
            {t("accountModals.cancel")}
          </button>
          <button
            type="button"
            onClick={() => {
              const parsed = Number(value);
              onSave(Number.isFinite(parsed) && parsed > 0 ? parsed : currentValue);
              onClose();
            }}
            className="h-[52px] rounded-[12px] bg-[#1175d5] text-[15px] font-bold text-white transition-colors hover:bg-[#0d69c2]"
          >
            Save Demo Balance
          </button>
        </div>
      </div>
    </div>
  );
};

export const AccountDropdown = ({
  accountType,
  balance,
  demoBalance,
  onSwitch,
  onOpenDeposit,
  onOpenWithdrawal,
  onOpenProfile,
  onUpdateDemoBalance,
  onResetDemoBalance,
  onClose,
}: {
  accountType: AccountType;
  balance: number;
  demoBalance: number;
  onSwitch: (t: AccountType) => void;
  onOpenDeposit: () => void;
  onOpenWithdrawal: () => void;
  onOpenProfile: (tab?: "personal" | "balance_history" | "trading_history" | "settings") => void;
  onUpdateDemoBalance: (value: number) => void;
  onResetDemoBalance: () => void;
  onClose: () => void;
}) => {
  const { profile } = useAuth();
  const { currency, formatMoney } = useCurrency();
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showDemoBalanceModal, setShowDemoBalanceModal] = useState(false);
  const [visible, setVisible] = useState(true);

  const profileEmail = profile?.email || "trader@platform.com";
  const accountId = profile?.id?.replace(/-/g, "").slice(0, 8).toUpperCase() || "84560898";

  return (
    <>
      <AccountCurrencyModal isOpen={showCurrencyModal} onClose={() => setShowCurrencyModal(false)} />
      <DemoBalanceModal
        isOpen={showDemoBalanceModal}
        currentValue={demoBalance}
        onClose={() => setShowDemoBalanceModal(false)}
        onSave={onUpdateDemoBalance}
      />
      <div className="fixed inset-0 z-[110]" onClick={onClose} />
      <div
        className="fixed left-3 right-3 top-[58px] z-[120] mx-auto w-auto max-w-[340px] overflow-hidden rounded-[12px] bg-[#161c28] p-4 text-left shadow-[0_20px_60px_rgba(0,0,0,0.5)] lg:absolute lg:left-auto lg:right-0 lg:top-full lg:mt-2 lg:w-[340px]"
        style={{ border: "1px solid #252e42" }}
      >
        {/* Top Header Card — matches Reference Image 2 */}
        <div className="rounded-[8px] bg-[#1d2536] p-3.5 border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 rounded-[6px] bg-[#252e42] px-3 py-1.5 text-[12px] font-black text-white">
              <Send className="h-4 w-4 text-[#00c853]" />
              <span>STANDARD:</span>
              <span className="text-[#00c853]">+0% profit</span>
            </div>
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-[#252e42] text-white/70 hover:text-white transition-colors"
            >
              {visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </button>
          </div>

          <div>
            <p className="truncate text-[14px] font-extrabold text-white">{profileEmail}</p>
            <p className="mt-0.5 text-[12px] font-bold text-white/50">ID: {visible ? accountId : "********"}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[13px] font-bold text-white/70">
                Currency: <strong className="text-white">{currency}</strong>
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCurrencyModal(true);
                }}
                className="rounded-[4px] bg-[#0084FF] px-2.5 py-1 text-[11px] font-black uppercase text-white hover:bg-[#0070df] transition-colors"
              >
                CHANGE
              </button>
            </div>
          </div>
        </div>

        {/* Account Options */}
        <div className="mt-4 space-y-3">
          {/* Live Account */}
          <div
            onClick={() => {
              onSwitch("live");
              onClose();
            }}
            className={`cursor-pointer rounded-[8px] p-3 transition-colors ${
              accountType === "live" ? "bg-[#21293a] border border-[#0084FF]/40" : "hover:bg-white/5"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-white/40">
                {accountType === "live" && <div className="h-2.5 w-2.5 rounded-full bg-[#0084FF]" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-extrabold text-white">Live Account</p>
                <p className="mt-0.5 text-[18px] font-black text-white">
                  {visible ? formatMoney(balance) : "****"}
                </p>
                <p className="mt-1 text-[12px] font-bold text-white/40">The daily limit is not set</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenProfile("settings");
                    onClose();
                  }}
                  className="mt-1 text-[11px] font-black uppercase text-[#0084FF] hover:underline"
                >
                  SET LIMIT
                </button>
              </div>
            </div>
          </div>

          {/* Demo Account */}
          <div
            onClick={() => {
              onSwitch("demo");
              onClose();
            }}
            className={`cursor-pointer rounded-[8px] p-3 transition-colors ${
              accountType === "demo" ? "bg-[#21293a] border border-[#0084FF]/40" : "hover:bg-white/5"
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-white/40">
                {accountType === "demo" && <div className="h-2.5 w-2.5 rounded-full bg-[#0084FF]" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-extrabold text-white">Demo Account</p>
                <div className="mt-0.5 flex items-center justify-between">
                  <span className="text-[18px] font-black text-white">
                    {visible ? formatMoney(demoBalance) : "****"}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onResetDemoBalance();
                      }}
                      className="p-1.5 text-white/50 hover:text-white transition-colors"
                      title="Reset demo balance"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDemoBalanceModal(true);
                      }}
                      className="p-1.5 text-white/50 hover:text-white transition-colors"
                      title="Edit demo balance"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
