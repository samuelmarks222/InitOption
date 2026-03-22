import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  CreditCard,
  Edit2,
  Landmark,
  LogOut,
  RefreshCw,
  Send,
  ShieldAlert,
  Ticket,
  Wallet,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useVip } from "@/contexts/VipContext";
import { Tables } from "@/integrations/supabase/types";
import { VipBadge } from "@/components/vip/VipBadge";
import { useCurrency } from "@/contexts/CurrencyContext";
import { AccountCurrencyModal } from "@/components/profile/AccountCurrencyModal";
import { requestDepositReview } from "@/lib/deposits";
import { requestWithdrawal } from "@/lib/withdrawals";

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
type PromoCode = Tables<"promo_codes">;
type DepositStep = "methods" | "details" | "checkout";
type DepositCategory = "popular" | "epay" | "banks" | "crypto";
type DepositMethodOption = {
  id: string;
  category: DepositCategory;
  name: string;
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

const PRESET_AMOUNTS = [150, 200, 300, 500];
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
    name: "M-Pesa",
    subtitle: "Mobile money",
    symbol: "MPESA",
    minAmount: 10,
    maxAmount: 10000,
    available: false,
    iconType: "wallet",
  },
  {
    id: "epay:airtel",
    category: "epay",
    name: "Airtel Money",
    subtitle: "Instant settlement",
    symbol: "AIRTEL",
    minAmount: 10,
    maxAmount: 10000,
    available: false,
    iconType: "wallet",
  },
  {
    id: "bank:visa",
    category: "banks",
    name: "Visa / Mastercard",
    subtitle: "Card processing",
    symbol: "CARD",
    minAmount: 10,
    maxAmount: 50000,
    available: false,
    iconType: "bank",
  },
  {
    id: "bank:wire",
    category: "banks",
    name: "Bank Transfer",
    subtitle: "Manual review",
    symbol: "WIRE",
    minAmount: 100,
    maxAmount: 100000,
    available: false,
    iconType: "bank",
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
  banks: {
    title: "Banks",
    description: "Cards and transfers",
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

const parsePromoBonus = (promo: PromoCode | null, baseAmount: number) => {
  if (!promo || baseAmount <= 0) return 0;
  const numericValue = Number(promo.reward_value.replace(/[^0-9.]/g, "")) || 0;
  if (promo.type === "Percentage") return (baseAmount * numericValue) / 100;
  return numericValue;
};

const getMethodIcon = (method: DepositMethodOption) => {
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
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/15 text-blue-300">
      <Landmark className="h-5 w-5" />
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

export const DepositModal = ({ onClose }: { onClose: () => void }) => {
  const { user, profile, refreshProfile } = useAuth();
  const [step, setStep] = useState<DepositStep>("methods");
  const [activeCategory, setActiveCategory] = useState<DepositCategory>("crypto");
  const [amount, setAmount] = useState("150");
  const [cryptoMethods, setCryptoMethods] = useState<CryptoPaymentMethod[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [promoInput, setPromoInput] = useState("");
  const [selectedPromoId, setSelectedPromoId] = useState<string | null>(null);
  const [promoExpanded, setPromoExpanded] = useState(true);
  const [promoFeedback, setPromoFeedback] = useState<{ text: string; valid: boolean } | null>(null);
  const [copiedField, setCopiedField] = useState<"amount" | "address" | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [checkoutDeadline, setCheckoutDeadline] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;

    const fetchDepositData = async () => {
      setLoading(true);
      const [methodsResponse, promosResponse] = await Promise.all([
        supabase
          .from("crypto_payment_methods")
          .select("*")
          .eq("status", "active")
          .order("coin_name"),
        supabase.from("promo_codes").select("*").eq("status", "active").order("created_at", { ascending: false }),
      ]);

      if (cancelled) return;

      if (methodsResponse.error) {
        toast({
          title: "Payment methods unavailable",
          description: methodsResponse.error.message,
          variant: "destructive",
        });
      } else {
        const methods = methodsResponse.data ?? [];
        setCryptoMethods(methods);
        if (methods.length > 0) {
          setSelectedMethodId((current) => current || methods[0].id);
        }
      }

      if (!promosResponse.error) {
        const validPromos = (promosResponse.data ?? []).filter((promo) => {
          const expiryTime = new Date(promo.expiry_date).getTime();
          return Number.isNaN(expiryTime) || expiryTime > Date.now();
        });
        setPromoCodes(validPromos);
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
      [...cryptoMethods].sort((left, right) => {
        const priorityDiff = getCryptoPriority(left) - getCryptoPriority(right);
        if (priorityDiff !== 0) return priorityDiff;

        if (left.symbol.toUpperCase() === right.symbol.toUpperCase()) {
          const networkDiff = getNetworkRank(left.network) - getNetworkRank(right.network);
          if (networkDiff !== 0) return networkDiff;
        }

        return getCryptoMethodName(left).localeCompare(getCryptoMethodName(right));
      }).map((method) => {
        const limits = getMethodLimits(method);
        return {
          id: method.id,
          category: "crypto",
          name: getCryptoMethodName(method),
          subtitle: `Min. ${formatCurrency(limits.minAmount)}`,
          symbol: method.symbol.toUpperCase(),
          network: method.network,
          minAmount: limits.minAmount,
          maxAmount: limits.maxAmount,
          available: Boolean(method.wallet_address),
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

  const displayedMethods = useMemo(() => {
    if (activeCategory === "popular") return popularMethods;
    if (activeCategory === "crypto") return cryptoDepositMethods;
    return STATIC_DEPOSIT_METHODS.filter((method) => method.category === activeCategory);
  }, [activeCategory, cryptoDepositMethods, popularMethods]);

  const selectedMethod =
    methodCatalog.find((method) => method.id === selectedMethodId) ??
    cryptoDepositMethods[0] ??
    null;
  const selectedNetwork = selectedMethod?.network?.toUpperCase() ?? "";
  const wrongNetworkHint =
    selectedNetwork && (selectedMethod?.symbol === "USDT" || selectedMethod?.symbol === "USDC")
      ? `Do not send ERC20, TRC20, TRX or other coins to this ${selectedNetwork} address.`
      : "Do not send funds through the wrong chain or unsupported coin.";

  const selectedPromo = promoCodes.find((promo) => promo.id === selectedPromoId) ?? null;
  const amountValue = Number(amount) || 0;
  const promoBonus = parsePromoBonus(selectedPromo, amountValue);
  const receiveAmount = amountValue + promoBonus;

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
        available: false,
      },
      {
        id: "banks" as DepositCategory,
        count: STATIC_DEPOSIT_METHODS.filter((method) => method.category === "banks").length,
        preview: ["Visa", "Wire"],
        available: false,
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

    setCheckoutDeadline(Date.now() + CHECKOUT_WINDOW_MS);
    setNow(Date.now());
  }, [step]);

  useEffect(() => {
    if (step !== "checkout" || !checkoutDeadline) return;

    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [checkoutDeadline, step]);

  const handleSelectCategory = (category: DepositCategory) => {
    setActiveCategory(category);

    if (category === "popular" && popularMethods[0]) {
      setSelectedMethodId(popularMethods[0].id);
    }

    if (category === "crypto" && cryptoDepositMethods[0]) {
      setSelectedMethodId(cryptoDepositMethods[0].id);
    }
  };

  const handleSelectMethod = (method: DepositMethodOption) => {
    if (!method.available) {
      toast({
        title: `${method.name} is coming soon`,
        description: "Crypto methods are live now. More deposit channels can be enabled next.",
      });
      return;
    }

    setSelectedMethodId(method.id);
    setStep("details");
  };

  const handleApplyPromo = () => {
    const normalizedCode = promoInput.trim().toUpperCase();
    if (!normalizedCode) {
      setSelectedPromoId(null);
      setPromoFeedback(null);
      return;
    }

    const matchedPromo = promoCodes.find((promo) => promo.code.toUpperCase() === normalizedCode);
    if (!matchedPromo) {
      setSelectedPromoId(null);
      setPromoFeedback({ text: "Promo code not found or expired.", valid: false });
      return;
    }

    if (matchedPromo.max_usages > 0 && matchedPromo.usages >= matchedPromo.max_usages) {
      setSelectedPromoId(null);
      setPromoFeedback({ text: "Promo code usage limit reached.", valid: false });
      return;
    }

    setSelectedPromoId(matchedPromo.id);
    setPromoInput(matchedPromo.code);
    setPromoFeedback({
      text: `${matchedPromo.code} applied. Bonus: ${matchedPromo.reward_value}.`,
      valid: true,
    });
  };

  const handlePickPromo = (promo: PromoCode) => {
    setPromoInput(promo.code);
    setSelectedPromoId(promo.id);
    setPromoFeedback({ text: `${promo.code} applied. Bonus: ${promo.reward_value}.`, valid: true });
  };

  const handleCopy = async (field: "amount" | "address", value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      window.setTimeout(() => setCopiedField(null), 1800);
      toast({
        title: field === "amount" ? "Amount copied" : "Address copied",
        description: field === "amount" ? "Deposit amount copied to clipboard." : "Wallet address copied to clipboard.",
      });
    } catch {
      toast({
        title: "Copy failed",
        description: "Clipboard access is blocked in this browser.",
        variant: "destructive",
      });
    }
  };

  const handleProceedToCheckout = () => {
    if (!selectedMethod) {
      toast({ title: "Choose a deposit method first", variant: "destructive" });
      return;
    }

    if (!selectedMethod.available || !selectedMethod.walletAddress) {
      toast({
        title: "This method is not ready",
        description: "Choose one of the active crypto methods to continue.",
        variant: "destructive",
      });
      return;
    }

    if (amountError) {
      toast({ title: amountError, variant: "destructive" });
      return;
    }

    setStep("checkout");
  };

  const handleConfirmDeposit = async () => {
    if (!user || !profile) {
      toast({
        title: "Sign in required",
        description: "Please sign in again before confirming this deposit.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedMethod || !selectedMethod.available) {
      toast({ title: "Choose an active deposit method", variant: "destructive" });
      return;
    }

    if (amountError) {
      toast({ title: amountError, variant: "destructive" });
      return;
    }

    setProcessing(true);

    try {
      const payload = await requestDepositReview({
        amount: amountValue,
        method: selectedMethod.symbol,
        paymentMethodId: selectedMethod.id,
        promoId: selectedPromo?.id ?? null,
      });

      await refreshProfile();

      const appliedPromoBonus = Number(payload.promo_bonus ?? promoBonus);
      toast({
        title: "Deposit submitted",
        description:
          appliedPromoBonus > 0
            ? `${formatCurrency(amountValue)} is now pending admin review. Automatic blockchain detection is not wired yet, so no balance was added and the promo bonus ${formatCurrency(appliedPromoBonus)} will only apply after approval.`
            : `${formatCurrency(amountValue)} is now pending admin review. Automatic blockchain detection is not wired yet, so no balance was added yet.`,
      });

      onClose();
    } catch (error) {
      toast({
        title: "Deposit failed",
        description: error instanceof Error ? error.message : "Something went wrong while confirming the deposit.",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const stepItems: Array<{ id: DepositStep; label: string }> = [
    { id: "methods", label: "Method" },
    { id: "details", label: "Amount" },
    { id: "checkout", label: "Transfer" },
  ];

  const headerTitle =
    step === "checkout" && selectedMethod
      ? `Deposit ${formatCurrency(amountValue)} via ${selectedMethod.name}`
      : "Deposit";

  return (
    <div className="fixed inset-0 z-50 bg-[#05070d]/82 p-3 backdrop-blur-sm sm:p-4">
      <div
        className="mx-auto flex h-[calc(100dvh-24px)] w-full max-w-[980px] flex-col overflow-hidden rounded-[20px] border text-white shadow-[0_32px_90px_rgba(0,0,0,0.55)] sm:h-[min(860px,calc(100dvh-32px))]"
        style={{ background: `linear-gradient(180deg, ${MODAL_BG} 0%, ${INNER_BG} 100%)`, borderColor: PANEL_BORDER }}
      >
        <div
          className="flex items-start justify-between gap-4 border-b px-4 py-4 sm:px-6 sm:py-5"
          style={{ backgroundColor: MODAL_BG, borderColor: PANEL_BORDER }}
        >
          <div className="min-w-0">
            <div className="flex items-center gap-3">
            {step !== "methods" && (
              <button
                onClick={() => setStep(step === "checkout" ? "details" : "methods")}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-gray-200 transition hover:bg-white/15 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
              <div className="min-w-0">
                <h2 className="truncate text-[22px] font-semibold text-white sm:text-[26px]">{headerTitle}</h2>
                <p className="mt-1 text-sm text-[#9dc2c8]">Secure funding flow with live payment addresses and manual approval.</p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
                {stepItems.map((entry, index) => {
                  const isActive = entry.id === step;
                  const isComplete =
                    (step === "details" || step === "checkout") && entry.id === "methods"
                      ? true
                      : step === "checkout" && entry.id === "details";

                  return (
                    <div
                      key={entry.id}
                      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                        isActive
                          ? "bg-[#0b65c2] text-white"
                          : isComplete
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-white/6 text-[#9dc2c8]"
                      }`}
                    >
                      <span>{index + 1}</span>
                      <span>{entry.label}</span>
                    </div>
                  );
                })}
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/5 text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
          {step === "methods" && (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr),320px]">
              <div className="rounded-[22px] border bg-white/5 p-4 sm:p-6" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="inline-flex rounded-full bg-[#0b65c2]/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6fb1ff]">
                      Deposit Methods
                    </div>
                    <h3 className="mt-3 text-2xl font-semibold text-white sm:text-[28px]">Choose how you want to pay</h3>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-[#9dc2c8]">
                      This brings back the simpler payment layout: pick a live method first, then enter the amount and transfer details.
                    </p>
                  </div>
                  <div className="inline-flex w-fit rounded-full bg-emerald-500/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300">
                    {cryptoDepositMethods.length} live now
                  </div>
                </div>

                {loading ? (
                  <div className="mt-5 flex min-h-[320px] items-center justify-center rounded-[18px] border border-dashed bg-black/20 px-6 text-slate-300" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                    <div className="flex items-center gap-3">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      Loading payment methods...
                    </div>
                  </div>
                ) : cryptoDepositMethods.length === 0 ? (
                  <div className="mt-5 flex min-h-[320px] items-center justify-center rounded-[18px] border border-dashed bg-black/20 px-6 text-center text-slate-400" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                    No active crypto deposit methods were found. Add or enable wallet addresses in the admin panel.
                  </div>
                ) : (
                  <div className="mt-5 grid gap-3">
                    {cryptoDepositMethods.map((method) => {
                      const isSelected = selectedMethodId === method.id;

                      return (
                        <button
                          key={method.id}
                          onClick={() => handleSelectMethod(method)}
                          className="group w-full rounded-[18px] border px-4 py-4 text-left transition hover:border-[#0b65c2] hover:bg-[#0b65c2]/8"
                          style={{
                            backgroundColor: isSelected ? "rgba(11, 101, 194, 0.12)" : "rgba(255,255,255,0.02)",
                            borderColor: isSelected ? "rgba(111,177,255,0.9)" : "rgba(255,255,255,0.08)",
                          }}
                        >
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-4">
                              <div className="shrink-0">{getMethodIcon(method)}</div>
                              <div className="min-w-0">
                                <div className="truncate text-lg font-bold text-white">{method.name}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  {method.network && (
                                    <span className="rounded-full bg-[#0b65c2]/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#6fb1ff]">
                                      {method.network}
                                    </span>
                                  )}
                                  <span className="text-sm text-[#9dc2c8]">{method.subtitle}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-1 flex-wrap items-center justify-between gap-3 sm:justify-end">
                              <div className="grid min-w-[180px] grid-cols-2 gap-3 text-sm text-[#9dc2c8]">
                                <div>
                                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Minimum</div>
                                  <div className="mt-1 font-semibold text-white">{formatCurrency(method.minAmount)}</div>
                                </div>
                                <div>
                                  <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Maximum</div>
                                  <div className="mt-1 font-semibold text-white">{formatCurrency(method.maxAmount)}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                                  Ready
                                </span>
                                <ChevronRight className="h-5 w-5 text-[#6fb1ff]" />
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-[22px] border bg-white/5 p-5" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6fb1ff]">Current Balance</div>
                  <div className="mt-3 text-3xl font-bold text-white">{formatCurrency(profile?.balance ?? 0)}</div>
                  <p className="mt-2 text-sm leading-6 text-[#9dc2c8]">
                    Deposits are credited only after a finance admin reviews and approves the request.
                  </p>
                </div>

                <div className="rounded-[22px] border bg-white/5 p-5" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="text-sm font-semibold text-white">How it works</div>
                  <div className="mt-4 space-y-3">
                    {[
                      "Choose the coin and the network that matches your wallet.",
                      "Enter the amount you want to send and apply a promo code if you have one.",
                      "Copy the address, make the transfer, then confirm it here so the request can be reviewed.",
                    ].map((item, index) => (
                      <div key={item} className="flex items-start gap-3 rounded-[16px] border border-white/8 bg-black/20 px-4 py-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0b65c2] text-xs font-bold text-white">
                          {index + 1}
                        </div>
                        <div className="text-sm text-[#d8f4f8]">{item}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {promoCodes.length > 0 && (
                  <div className="rounded-[22px] border bg-[#0b65c2]/10 p-5" style={{ borderColor: "rgba(111,177,255,0.28)" }}>
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0b65c2]/20 text-[#6fb1ff]">
                        <Ticket className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-base font-semibold text-white">Bonuses available</div>
                        <div className="mt-1 text-sm text-[#b8d7ff]">
                          {promoCodes.length} active promo {promoCodes.length === 1 ? "code is" : "codes are"} ready to apply before payment.
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === "details" && selectedMethod && (
            <div className="grid gap-5 xl:grid-cols-[320px,minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="rounded-[22px] border bg-white/5 p-5" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center gap-3">
                    {getMethodIcon(selectedMethod)}
                    <div className="min-w-0">
                      <h3 className="truncate text-xl font-bold text-white sm:text-2xl">{selectedMethod.name}</h3>
                      <p className="text-sm text-[#6fb1ff]">{selectedMethod.network ?? selectedMethod.symbol}</p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3">
                    <div className="rounded-[16px] border border-white/8 bg-black/20 px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Deposit limits</div>
                      <div className="mt-3 flex items-center justify-between text-sm text-[#9dc2c8]">
                        <span>Minimum</span>
                        <span className="font-semibold text-white">{formatCurrency(selectedMethod.minAmount)}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-sm text-[#9dc2c8]">
                        <span>Maximum</span>
                        <span className="font-semibold text-white">{formatCurrency(selectedMethod.maxAmount)}</span>
                      </div>
                    </div>

                    <div className="rounded-[16px] border border-white/8 bg-black/20 px-4 py-3">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Projected balance after approval</div>
                      <div className="mt-2 text-2xl font-bold text-white">{formatCurrency((profile?.balance ?? 0) + receiveAmount)}</div>
                      <div className="mt-2 text-xs text-[#9dc2c8]">Funds stay pending until a finance admin reviews and approves the request.</div>
                    </div>
                  </div>

                  <button
                    onClick={() => setStep("methods")}
                    className="mt-5 flex items-center gap-2 text-sm font-semibold text-[#6fb1ff] transition hover:text-[#96c7ff]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Change payment method
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[22px] border bg-white/5 p-5 sm:p-6" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6fb1ff]">Amount</div>
                  <h3 className="mt-2 text-2xl font-semibold text-white">Enter the deposit details</h3>
                  <p className="mt-2 text-sm leading-6 text-[#9dc2c8]">
                    Keep it simple: choose an amount, add an optional promo code, and continue to the wallet address.
                  </p>

                  <div className="mt-6">
                    <label className="mb-2 block text-sm font-medium text-[#9dc2c8]">Amount (USD)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">$</span>
                      <input
                        type="number"
                        min={selectedMethod.minAmount}
                        max={selectedMethod.maxAmount}
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        className="w-full rounded-[16px] border border-white/10 bg-black/25 py-4 pl-10 pr-4 text-2xl font-bold text-white outline-none transition focus:border-[#0b65c2] sm:text-3xl"
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {PRESET_AMOUNTS.map((preset) => (
                        <button
                          key={preset}
                          onClick={() => setAmount(String(preset))}
                          className={`rounded-xl border px-4 py-2.5 text-sm font-bold transition sm:text-base ${
                            amount === String(preset)
                              ? "border-[#0b65c2] bg-[#0b65c2] text-white"
                              : "border-white/10 bg-white/5 text-gray-300 hover:border-white/20 hover:bg-white/10"
                          }`}
                        >
                          ${preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(promoCodes.length > 0 || promoInput || promoFeedback) && (
                    <div className="mt-6 rounded-[18px] border border-white/8 bg-black/20 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0b65c2]/15 text-[#6fb1ff]">
                            <Ticket className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="text-base font-semibold text-white">Promo code</div>
                            <div className="text-sm text-[#9dc2c8]">Optional bonus before you continue.</div>
                          </div>
                        </div>
                        {promoCodes.length > 0 && (
                          <button
                            onClick={() => setPromoExpanded((current) => !current)}
                            className="text-[#6fb1ff] transition hover:text-[#96c7ff]"
                          >
                            <ChevronDown className={`h-5 w-5 transition ${promoExpanded ? "rotate-180" : ""}`} />
                          </button>
                        )}
                      </div>

                      <div className="mt-4 flex flex-col gap-3 md:flex-row">
                        <div className="flex min-h-[52px] flex-1 items-center gap-3 rounded-[14px] border border-white/10 bg-white/5 px-4">
                          <Ticket className="h-5 w-5 text-[#6fb1ff]" />
                          <input
                            value={promoInput}
                            onChange={(event) => setPromoInput(event.target.value.toUpperCase())}
                            placeholder="Enter or select code"
                            className="h-full flex-1 bg-transparent text-base font-semibold text-white outline-none placeholder:text-slate-500"
                          />
                        </div>
                        <button
                          onClick={handleApplyPromo}
                          className="rounded-[14px] bg-[#0b65c2] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#0d75df]"
                        >
                          Apply code
                        </button>
                      </div>

                      {promoFeedback && (
                        <p className={`mt-3 text-sm font-semibold ${promoFeedback.valid ? "text-emerald-400" : "text-red-400"}`}>
                          {promoFeedback.text}
                        </p>
                      )}

                      {promoExpanded && promoCodes.length > 0 && (
                        <div className="mt-4 space-y-2">
                          {promoCodes.slice(0, 4).map((promo) => (
                            <button
                              key={promo.id}
                              onClick={() => handlePickPromo(promo)}
                              className="flex w-full flex-col gap-2 rounded-[14px] border border-white/8 bg-white/5 px-4 py-3 text-left transition hover:border-[#0b65c2] hover:bg-[#0b65c2]/8 sm:flex-row sm:items-center sm:justify-between"
                            >
                              <div>
                                <div className="text-sm font-bold text-white">{promo.code}</div>
                                <div className="text-sm text-[#9dc2c8]">{promo.reward_value} bonus</div>
                              </div>
                              <div className="text-xs font-medium text-slate-400">
                                Expires {new Date(promo.expiry_date).toLocaleDateString()}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-6 rounded-[18px] border border-white/8 bg-black/20 p-4">
                    <div className="flex items-center justify-between text-sm text-[#9dc2c8]">
                      <span>Deposit amount</span>
                      <span className="font-semibold text-white">{formatCurrency(amountValue)}</span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-[#9dc2c8]">
                      <span>Promo bonus</span>
                      <span className="font-semibold text-white">{formatCurrency(promoBonus)}</span>
                    </div>
                    <div className="mt-4 border-t border-white/8 pt-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-lg font-semibold text-white">You will receive</span>
                        <span className="text-2xl font-bold text-[#6fb1ff] sm:text-3xl">{formatCurrency(receiveAmount)}</span>
                      </div>
                    </div>
                  </div>

                  {amountError && (
                    <div className="mt-4 rounded-[16px] border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {amountError}
                    </div>
                  )}

                  <button
                    onClick={handleProceedToCheckout}
                    className="mt-6 w-full rounded-[16px] bg-[#0b65c2] px-6 py-4 text-lg font-bold text-white transition hover:bg-[#0d75df] sm:text-xl"
                  >
                    Continue to payment
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === "checkout" && selectedMethod && (
            <div className="grid gap-5 xl:grid-cols-[320px,minmax(0,1fr)]">
              <div className="space-y-4">
                <div className="rounded-[22px] border bg-white/5 p-5" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="text-xs font-semibold uppercase tracking-[0.22em] text-[#6fb1ff]">Payment Summary</div>
                  <h3 className="mt-2 text-2xl font-semibold text-white">Send the payment and confirm it here.</h3>
                  <p className="mt-2 text-sm text-[#9dc2c8]">
                    The transfer details are locked to this method so users do not accidentally send to the wrong address.
                  </p>

                  <div className="mt-6 space-y-3">
                    {[
                      `Only send ${selectedMethod.symbol} on ${selectedNetwork || selectedMethod.symbol}.`,
                      "Use the wallet address shown on this screen for this payment.",
                      "After sending, click the confirmation button to create a pending request for admin review.",
                    ].map((item, index) => (
                      <div
                        key={item}
                        className="flex items-start gap-3 rounded-[16px] border px-4 py-3"
                        style={{ backgroundColor: INNER_BG, borderColor: PANEL_BORDER }}
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0b65c2] text-xs font-bold text-white">
                          {index + 1}
                        </div>
                        <div className="text-sm font-medium text-[#d8f4f8]">{item}</div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-[16px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                    {wrongNetworkHint}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-[22px] border bg-white/5 p-5 sm:p-6" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
                  <div className="grid gap-6 lg:grid-cols-[180px,minmax(0,1fr)] lg:items-start">
                    <div className="rounded-[14px] bg-white p-3">
                      {selectedMethod.qrCodeUrl ? (
                        <img src={selectedMethod.qrCodeUrl} alt={`${selectedMethod.name} QR code`} className="h-full w-full rounded-[10px] object-cover" />
                      ) : (
                        <div className="flex h-[154px] items-center justify-center rounded-[10px] border border-dashed border-slate-300 px-3 text-center text-sm font-medium text-slate-500">
                          QR code not configured yet
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6fb1ff]">Wallet address</div>
                        <div className="mt-2 break-all rounded-[16px] border border-white/8 bg-black/20 px-4 py-3 text-base font-semibold leading-relaxed text-white sm:text-lg">
                          {selectedMethod.walletAddress}
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <button
                          onClick={() => handleCopy("amount", amountValue.toFixed(2))}
                          className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-[#0b65c2] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0d75df]"
                        >
                          {copiedField === "amount" ? <CheckCircle className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                          Copy amount
                        </button>
                        <button
                          onClick={() => handleCopy("address", selectedMethod.walletAddress ?? "")}
                          className="inline-flex items-center justify-center gap-2 rounded-[14px] bg-[#0b65c2] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0d75df]"
                        >
                          {copiedField === "address" ? <CheckCircle className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                          Copy address
                        </button>
                      </div>

                      <div className="rounded-[16px] border border-white/8 bg-black/20 px-4 py-4">
                        <div className="text-sm font-semibold text-white">Before you click confirm</div>
                        <div className="mt-3 space-y-3">
                          {[
                            `Send only ${selectedMethod.symbol} on ${selectedNetwork || selectedMethod.symbol}.`,
                            "Use the exact wallet address shown on this screen.",
                            "After sending the funds, click the confirmation button below to submit the request for review.",
                          ].map((item, index) => (
                            <div key={item} className="flex items-start gap-3 text-sm text-[#d8f4f8]">
                              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0b65c2] text-[11px] font-bold text-white">
                                {index + 1}
                              </div>
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4 rounded-[22px] border border-white/8 bg-white/5 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3 text-base font-semibold text-white sm:text-lg">
                    <Clock3 className="h-5 w-5 text-[#6fb1ff]" />
                    <span>Time remaining: {formatCountdown(checkoutDeadline, now)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-[#9dc2c8] sm:text-base">
                    <RefreshCw className={`h-5 w-5 ${processing ? "animate-spin text-[#6fb1ff]" : ""}`} />
                    <span>{processing ? "Submitting your confirmation..." : "Waiting for manual admin approval."}</span>
                  </div>
                </div>

                <button
                  onClick={handleConfirmDeposit}
                  disabled={processing}
                  className="w-full rounded-[16px] bg-[#0b65c2] px-6 py-4 text-lg font-bold text-white transition hover:bg-[#0d75df] disabled:cursor-not-allowed disabled:opacity-60 sm:text-xl"
                >
                  {processing ? "Processing..." : "I've sent the payment"}
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
  const { refreshProfile } = useAuth();
  const [amount, setAmount] = useState("50");
  const [method, setMethod] = useState<"bank" | "crypto">("bank");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [cryptoMethods, setCryptoMethods] = useState<CryptoPaymentMethod[]>([]);
  const [selectedCryptoId, setSelectedCryptoId] = useState("");
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadCryptoMethods = async () => {
      setLoadingMethods(true);
      const { data, error } = await supabase
        .from("crypto_payment_methods")
        .select("*")
        .eq("status", "active")
        .order("coin_name");

      if (cancelled) return;

      if (error) {
        toast({
          title: "Crypto methods unavailable",
          description: error.message,
          variant: "destructive",
        });
        setLoadingMethods(false);
        return;
      }

      const methods = data ?? [];
      setCryptoMethods(methods);
      if (methods[0]) {
        setSelectedCryptoId((current) => current || methods[0].id);
      }
      setLoadingMethods(false);
    };

    void loadCryptoMethods();

    return () => {
      cancelled = true;
    };
  }, []);

  const amountValue = Number(amount) || 0;
  const selectedCrypto = cryptoMethods.find((entry) => entry.id === selectedCryptoId) ?? null;
  const destination =
    method === "bank"
      ? [bankAccountName.trim(), bankAccountNumber.trim()].filter(Boolean).join(" | ")
      : walletAddress.trim();
  const destinationPreview =
    method === "bank"
      ? bankAccountNumber.trim() || "Waiting for account details"
      : walletAddress.trim() || "Waiting for wallet address";
  const methodLabel =
    method === "bank"
      ? "Bank Transfer"
      : selectedCrypto
        ? `${selectedCrypto.symbol.toUpperCase()} (${selectedCrypto.network.toUpperCase()}) Wallet`
        : "Crypto Wallet";

  const handleSubmit = async () => {
    if (amountValue <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }

    if (amountValue < 10) {
      toast({ title: "Minimum withdrawal is $10", variant: "destructive" });
      return;
    }

    if (amountValue > balance) {
      toast({
        title: "Insufficient funds",
        description: `Your live balance is ${formatCurrency(balance)}.`,
        variant: "destructive",
      });
      return;
    }

    if (method === "bank") {
      if (!bankAccountName.trim() || !bankAccountNumber.trim()) {
        toast({
          title: "Add full bank details",
          description: "Enter both the account holder name and the account number.",
          variant: "destructive",
        });
        return;
      }
    } else {
      if (!selectedCrypto) {
        toast({ title: "Choose a crypto method", variant: "destructive" });
        return;
      }

      if (!walletAddress.trim()) {
        toast({ title: "Enter your wallet address", variant: "destructive" });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      await requestWithdrawal({
        amount: amountValue,
        destination,
        method: methodLabel,
      });

      await refreshProfile();
      toast({
        title: "Withdrawal submitted",
        description: `${formatCurrency(amountValue)} is now pending admin review.`,
      });
      onClose();
    } catch (error) {
      toast({
        title: "Withdrawal failed",
        description: error instanceof Error ? error.message : "Something went wrong while submitting the withdrawal request.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className="w-[420px] overflow-hidden rounded-[20px] border shadow-2xl"
        style={{ background: `linear-gradient(180deg, ${MODAL_BG} 0%, ${INNER_BG} 100%)`, borderColor: PANEL_BORDER }}
      >
        <div className="flex items-center justify-between border-b px-5 py-5" style={{ backgroundColor: MODAL_BG, borderColor: PANEL_BORDER }}>
          <div>
            <div className="text-[18px] font-semibold text-white">Withdraw Funds</div>
            <div className="text-sm text-[#9dc2c8]">Move funds from your live account safely.</div>
          </div>
          <button onClick={onClose} className="text-gray-400 transition-colors hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 p-5">
          <div className="rounded-[18px] border p-4" style={{ backgroundColor: SURFACE_BG, borderColor: PANEL_BORDER }}>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#86c9d4]">Available Balance</div>
            <div className="mt-2 text-[30px] font-bold text-white">{formatCurrency(balance)}</div>
            <div className="mt-2 text-sm text-[#9dc2c8]">Minimum withdrawal is $10. Requests are reviewed before processing.</div>
          </div>

          <div className="flex gap-2">
            {(["bank", "crypto"] as const).map((entry) => (
              <button
                key={entry}
                onClick={() => setMethod(entry)}
                className={`flex-1 rounded-lg py-2 text-[11px] font-bold uppercase tracking-wide transition-all ${
                  method === entry
                    ? "bg-[#86c9d4] text-[#121f27]"
                    : "text-gray-300 hover:text-white"
                }`}
                style={method === entry ? undefined : { backgroundColor: SURFACE_BG }}
              >
                {entry === "bank" ? "Bank Transfer" : "Crypto Wallet"}
              </button>
            ))}
          </div>

          <div className="rounded-[18px] border p-4" style={{ backgroundColor: SURFACE_BG, borderColor: PANEL_BORDER }}>
            <label className="mb-2 block text-sm font-medium text-[#9dc2c8]">Withdrawal amount</label>
            <input
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              min="10"
              max={balance}
              className="w-full rounded-[14px] border px-4 py-3 text-[20px] font-bold text-white outline-none transition-colors focus:border-[#86c9d4]"
              style={{ backgroundColor: INNER_BG, borderColor: PANEL_BORDER }}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {[50, 100, 250].map((preset) => (
                <button
                  key={preset}
                  onClick={() => setAmount(String(preset))}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    amount === String(preset)
                      ? "bg-[#86c9d4] text-[#121f27]"
                      : "text-white hover:bg-[#24414d]"
                  }`}
                  style={amount === String(preset) ? undefined : { backgroundColor: INNER_BG }}
                >
                  {formatCurrency(preset)}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[18px] border p-4" style={{ backgroundColor: SURFACE_BG, borderColor: PANEL_BORDER }}>
            <div className="mb-3 text-sm font-medium text-[#9dc2c8]">
              {method === "bank" ? "Bank payout details" : "Destination wallet"}
            </div>
            {method === "bank" ? (
              <div className="space-y-2">
                <input
                  value={bankAccountName}
                  onChange={(event) => setBankAccountName(event.target.value)}
                  placeholder="Account holder name"
                  className="w-full rounded-lg border px-3 py-2.5 text-[13px] text-white outline-none transition-colors placeholder:text-gray-600 focus:border-[#86c9d4]"
                  style={{ backgroundColor: INNER_BG, borderColor: PANEL_BORDER }}
                />
                <input
                  value={bankAccountNumber}
                  onChange={(event) => setBankAccountNumber(event.target.value)}
                  placeholder="IBAN / Account number"
                  className="w-full rounded-lg border px-3 py-2.5 text-[13px] text-white outline-none transition-colors placeholder:text-gray-600 focus:border-[#86c9d4]"
                  style={{ backgroundColor: INNER_BG, borderColor: PANEL_BORDER }}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid max-h-[150px] gap-2 overflow-y-auto pr-1">
                  {loadingMethods ? (
                    <div className="rounded-lg border px-3 py-3 text-sm text-[#9dc2c8]" style={{ backgroundColor: INNER_BG, borderColor: PANEL_BORDER }}>
                      Loading crypto methods...
                    </div>
                  ) : cryptoMethods.length === 0 ? (
                    <div className="rounded-lg border px-3 py-3 text-sm text-[#9dc2c8]" style={{ backgroundColor: INNER_BG, borderColor: PANEL_BORDER }}>
                      No active crypto payout methods found yet.
                    </div>
                  ) : (
                    cryptoMethods.map((crypto) => {
                      const isActive = selectedCryptoId === crypto.id;
                      return (
                        <button
                          key={crypto.id}
                          type="button"
                          onClick={() => setSelectedCryptoId(crypto.id)}
                          className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                            isActive ? "border-[#86c9d4] bg-[#86c9d4]/10" : "hover:bg-white/5"
                          }`}
                          style={isActive ? undefined : { backgroundColor: INNER_BG, borderColor: PANEL_BORDER }}
                        >
                          <img
                            src={getCryptoIcon(crypto.symbol)}
                            alt={crypto.symbol}
                            className="h-8 w-8 rounded-full bg-white object-cover"
                            onError={(event) => {
                              event.currentTarget.style.display = "none";
                            }}
                          />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-white">
                              {crypto.symbol.toUpperCase()} ({crypto.network.toUpperCase()})
                            </div>
                            <div className="truncate text-[11px] text-[#9dc2c8]">{crypto.coin_name}</div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                <input
                  value={walletAddress}
                  onChange={(event) => setWalletAddress(event.target.value)}
                  placeholder="Your wallet address"
                  className="w-full rounded-lg border px-3 py-2.5 font-mono text-[13px] text-white outline-none transition-colors placeholder:text-gray-600 focus:border-[#86c9d4]"
                  style={{ backgroundColor: INNER_BG, borderColor: PANEL_BORDER }}
                />
              </div>
            )}
          </div>

          <div className="rounded-[18px] border p-4" style={{ backgroundColor: INNER_BG, borderColor: PANEL_BORDER }}>
            <div className="text-sm font-semibold text-white">Review</div>
            <div className="mt-3 flex items-center justify-between text-sm text-[#9dc2c8]">
              <span>Method</span>
              <span className="font-semibold text-white">{methodLabel}</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-sm text-[#9dc2c8]">
              <span>Amount</span>
              <span className="font-semibold text-white">{formatCurrency(amountValue)}</span>
            </div>
            <div className="mt-2 flex items-start justify-between gap-4 text-sm text-[#9dc2c8]">
              <span>Destination</span>
              <span className="max-w-[220px] break-all text-right font-semibold text-white">{destinationPreview}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full rounded-xl bg-[#86c9d4] py-3 text-[14px] font-bold text-[#121f27] transition-all hover:bg-[#9ad9e2] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {isSubmitting ? "Submitting request..." : `Request Withdrawal ${amount || "0"}`}
          </button>
          <p className="text-center text-[11px] text-[#7fa5ab]">Requests are reviewed manually and usually processed within 24 hours.</p>
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
  const stackLayers = [
    { translateX: -14, translateY: 32, scale: 0.86, opacity: 0.46 },
    { translateX: -6, translateY: 18, scale: 0.93, opacity: 0.62 },
    { translateX: 2, translateY: 0, scale: 1, opacity: 1 },
  ];

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-[#03060d]/82 p-4 backdrop-blur-[3px]">
      <div
        className="relative w-full max-w-[410px] overflow-hidden rounded-[26px] border shadow-[0_35px_100px_rgba(8,18,40,0.62)]"
        style={{
          background:
            "linear-gradient(180deg, rgba(50,63,99,0.98) 0%, rgba(42,53,84,0.98) 100%)",
          borderColor: "rgba(173, 205, 255, 0.18)",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(106,180,255,0.28),transparent_42%)]" />
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full text-[#a7b8db] transition hover:bg-white/5 hover:text-white"
          aria-label="Close welcome modal"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="relative px-5 pb-8 pt-7 sm:px-6">
          <div className="mx-auto mb-5 h-[258px] w-full max-w-[296px]">
            <div className="relative h-full w-full">
              <div className="absolute left-1/2 top-10 h-28 w-28 -translate-x-1/2 rounded-full bg-[#5dc2ff]/25 blur-3xl" />
              <div className="absolute left-1/2 top-[74px] h-[118px] w-[118px] -translate-x-1/2 rounded-full border border-white/12 bg-white/5 backdrop-blur-sm" />
              <div className="absolute left-1/2 top-[104px] flex h-[60px] w-[60px] -translate-x-1/2 items-center justify-center rounded-full border border-white/15 bg-white/10 shadow-[0_8px_24px_rgba(70,150,255,0.28)]">
                <Wallet className="h-7 w-7 text-[#edf5ff]" />
              </div>

              <div className="absolute left-1/2 bottom-1 h-[84px] w-[236px] -translate-x-1/2 rounded-full border border-[#7db5ff]/14 bg-[radial-gradient(circle_at_center,rgba(86,164,255,0.72),rgba(54,112,211,0.34)_52%,rgba(32,55,110,0.08)_74%,transparent_80%)] shadow-[0_18px_50px_rgba(44,119,236,0.35)]" />
              <div className="absolute left-1/2 bottom-[12px] h-[56px] w-[214px] -translate-x-1/2 rounded-full border border-white/6" />
              <div className="absolute left-1/2 bottom-[26px] h-[138px] w-[190px] -translate-x-1/2">
                {stackLayers.map((layer, index) => (
                  <div
                    key={index}
                    className="absolute left-1/2 top-0"
                    style={{
                      transform: `translate(calc(-50% + ${layer.translateX}px), ${layer.translateY}px) scale(${layer.scale})`,
                      opacity: layer.opacity,
                    }}
                  >
                    <div
                      className="relative h-[62px] w-[170px] rounded-[16px] border"
                      style={{
                        background:
                          "linear-gradient(180deg, rgba(224,242,255,0.94) 0%, rgba(148,213,255,0.92) 36%, rgba(78,171,255,0.48) 100%)",
                        borderColor: "rgba(240,248,255,0.45)",
                        boxShadow: "0 12px 24px rgba(55, 136, 237, 0.24)",
                      }}
                    >
                      <div className="absolute inset-x-0 top-0 h-3 rounded-t-[16px] bg-white/55" />
                      <div className="absolute inset-y-[10px] left-4 right-[52px] rounded-[10px] border border-white/50 bg-[linear-gradient(180deg,rgba(240,250,255,0.95),rgba(162,222,255,0.55))]" />
                      <div className="absolute inset-y-0 right-[44px] w-[34px] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(205,225,255,0.78))]" />
                      <div className="absolute inset-y-0 right-[55px] w-[2px] bg-[#9ac7ff]" />
                      <div className="absolute inset-y-0 right-[66px] w-[2px] bg-[#9ac7ff]" />
                      <div className="absolute left-7 top-[19px] h-[7px] w-[58px] rounded-full bg-[#cbe8ff]" />
                      <div className="absolute left-7 top-[31px] h-[5px] w-[40px] rounded-full bg-[#89caff]" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="absolute left-[18px] top-[58px] h-5 w-[2px] rotate-[-20deg] rounded-full bg-[#7bd0ff] shadow-[0_0_10px_rgba(123,208,255,0.8)]" />
              <div className="absolute left-[34px] top-[112px] h-3 w-3 rounded-full bg-[#80cfff]/65 blur-[1px]" />
              <div className="absolute left-[22px] top-[148px] h-6 w-[2px] rotate-[24deg] rounded-full bg-[#7bd0ff] shadow-[0_0_10px_rgba(123,208,255,0.7)]" />
              <div className="absolute right-[26px] top-[50px] h-7 w-[2px] rotate-[26deg] rounded-full bg-[#7bd0ff] shadow-[0_0_10px_rgba(123,208,255,0.8)]" />
              <div className="absolute right-[14px] top-[128px] h-4 w-4 rounded-full bg-[#80cfff]/60 blur-[1px]" />
              <div className="absolute right-[36px] top-[160px] h-5 w-[2px] rotate-[-22deg] rounded-full bg-[#7bd0ff] shadow-[0_0_10px_rgba(123,208,255,0.75)]" />
            </div>
          </div>

          <h2 className="text-center text-[22px] font-bold text-white sm:text-[24px]">
            Choose what you want to do first
          </h2>
          <p className="mx-auto mt-4 max-w-[300px] text-center text-[17px] font-medium leading-8 text-[#dce9ff]">
            Fund the live account, request a withdrawal, or keep practicing with a demo balance.
          </p>

          <div className="mt-8 space-y-3">
            <button
              onClick={onWithdraw}
              className="w-full rounded-[14px] border px-5 py-3.5 text-[17px] font-semibold text-[#eef4ff] transition hover:bg-white/10"
              style={{
                background: "rgba(79, 94, 136, 0.72)",
                borderColor: "rgba(155, 183, 236, 0.18)",
              }}
            >
              Withdraw
            </button>
            <button
              onClick={onDeposit}
              className="w-full rounded-[14px] px-5 py-3.5 text-[17px] font-semibold text-white transition hover:brightness-105"
              style={{
                background: "linear-gradient(180deg, #47adff 0%, #3397ef 100%)",
                boxShadow: "0 14px 30px rgba(52, 140, 236, 0.32)",
              }}
            >
              Deposit
            </button>
          </div>

          <button
            onClick={onUseDemo}
            className="mt-6 w-full text-center text-[15px] font-medium text-[#55b7ff] transition hover:text-[#86cbff]"
          >
            Trade on Demo Account
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
            <p className="mt-2 text-[14px] leading-6 text-[#9aa7bf]">
              Set any demo amount you want for practice. This never touches your live funds.
            </p>
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
            Cancel
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
  onOpenProfile: (tab?: "personal" | "balance_history" | "trading_history") => void;
  onUpdateDemoBalance: (value: number) => void;
  onResetDemoBalance: () => void;
  onClose: () => void;
}) => {
  const { profile, signOut } = useAuth();
  const { vip } = useVip();
  const { currency, formatMoney } = useCurrency();
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showDemoBalanceModal, setShowDemoBalanceModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const navigate = useNavigate();

  const openQuickAction = (action: () => void) => {
    onClose();
    action();
  };

  const handleLogout = async () => {
    if (isSigningOut) return;

    setIsSigningOut(true);

    try {
      onClose();
      await signOut();
      navigate("/login", { replace: true });
    } finally {
      setIsSigningOut(false);
    }
  };

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
        className="fixed left-2 right-2 top-[58px] z-[120] w-auto max-w-[360px] overflow-hidden rounded-[18px] text-left shadow-2xl lg:absolute lg:left-auto lg:right-0 lg:top-full lg:mt-3 lg:w-[340px]"
        style={{ background: "hsl(228 20% 14%)", border: "1px solid hsl(228 15% 20%)" }}
      >
        <div className="flex items-center justify-between p-3" style={{ background: "hsl(228 20% 12%)" }}>
          <div className="flex items-center gap-3">
            <Send className="h-5 w-5 text-green-500" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Standard:</span>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold leading-tight text-white">{vip.currentTier.name} VIP</span>
                <VipBadge tierId={vip.currentTier.id} size={18} />
              </div>
            </div>
          </div>
          <div className="rounded-full bg-white/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#8fa3c8]">
            {accountType.toUpperCase()}
          </div>
        </div>

        <div className="space-y-1.5 p-4" style={{ background: "hsl(228 20% 12%)" }}>
          <div className="truncate text-[14px] font-bold text-white">{profile?.email || "trader@platform.com"}</div>
          <div className="flex items-center gap-2 text-[11px] text-gray-400">
            <VipBadge tierId={vip.currentTier.id} size={16} />
            <span>{vip.currentTier.shortDescription}</span>
          </div>
          <div className="text-[13px] font-medium text-gray-500">ID: {profile?.id?.slice(0, 8).toUpperCase() || "--------"}</div>
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-[13px] text-gray-500">Currency:</span>
              <span className="text-[13px] font-bold text-white">{currency}</span>
            </div>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setShowCurrencyModal(true);
              }}
              className="text-[11px] font-bold uppercase tracking-wide text-[#86c9d4] transition-colors hover:text-white"
            >
              Change
            </button>
          </div>
        </div>

        <div
          onClick={() => {
            onSwitch("live");
            onClose();
          }}
          className={`cursor-pointer border-t border-white/5 p-4 transition-colors ${accountType === "live" ? "" : "hover:bg-white/5"}`}
        >
          <div className="flex items-start gap-3">
            <div className="pt-0.5">
              {accountType === "live" ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0b65c2]">
                  <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                </div>
              ) : (
                <div className="h-5 w-5 rounded-full border-[1.5px] border-gray-400" />
              )}
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-semibold leading-tight text-white">Live Account</div>
              <div className={`mt-0.5 text-[16px] font-bold ${accountType === "live" ? "text-white" : "text-gray-400"}`}>
                {formatMoney(balance)}
              </div>
              <div className="mt-1 text-[12px] text-gray-500">Funds show here after a real deposit is completed.</div>
            </div>
          </div>
        </div>

        <div
          onClick={() => {
            onSwitch("demo");
            onClose();
          }}
          className={`cursor-pointer border-t border-white/5 p-4 transition-colors ${accountType === "demo" ? "" : "hover:bg-white/5"}`}
        >
          <div className="flex items-start gap-3">
            <div className="pt-0.5">
              {accountType === "demo" ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0b65c2]">
                  <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                </div>
              ) : (
                <div className="h-5 w-5 rounded-full border-[1.5px] border-gray-400" />
              )}
            </div>
            <div className="flex flex-1 items-start justify-between">
              <div>
                <div className="text-[14px] font-semibold leading-tight text-white">Demo Account</div>
                <div className={`mt-0.5 text-[16px] font-bold ${accountType === "demo" ? "text-white" : "text-gray-400"}`}>
                  {formatMoney(demoBalance)}
                </div>
                <div className="mt-1 text-[12px] text-gray-500">Editable practice balance for demo trading.</div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onResetDemoBalance();
                  }}
                  className="p-1 text-gray-500 transition-colors hover:text-white"
                  title="Reset demo balance"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setShowDemoBalanceModal(true);
                  }}
                  className="p-1 text-gray-500 transition-colors hover:text-white"
                  title="Edit demo balance"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div
          onClick={() => {
            onSwitch("tournament");
            onClose();
          }}
          className={`cursor-pointer border-t border-white/5 p-4 transition-colors ${accountType === "tournament" ? "" : "hover:bg-white/5"}`}
        >
          <div className="flex items-start gap-3">
            <div className="pt-0.5">
              {accountType === "tournament" ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00C076]">
                  <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
                </div>
              ) : (
                <div className="h-5 w-5 rounded-full border-[1.5px] border-gray-400" />
              )}
            </div>
            <div>
              <div className="text-[14px] font-semibold leading-tight text-[#00C076]">Tournament Account</div>
              <div className="mt-0.5 text-[14px] text-gray-400">
                {accountType === "tournament" ? "Active" : "Join a tournament"}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-white/5 p-3" style={{ background: "hsl(228 20% 12%)" }}>
          <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#7f8ea8]">Quick actions</div>
          <div className="grid gap-2">
            <button
              type="button"
              onClick={() => openQuickAction(onOpenDeposit)}
              className="flex w-full items-center justify-between rounded-[12px] bg-white/5 px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-white/10"
            >
              Deposit
              <ChevronRight className="h-4 w-4 text-[#8fa3c8]" />
            </button>
            <button
              type="button"
              onClick={() => openQuickAction(onOpenWithdrawal)}
              className="flex w-full items-center justify-between rounded-[12px] bg-white/5 px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-white/10"
            >
              Withdrawal
              <ChevronRight className="h-4 w-4 text-[#8fa3c8]" />
            </button>
            <button
              type="button"
              onClick={() => openQuickAction(() => onOpenProfile("balance_history"))}
              className="flex w-full items-center justify-between rounded-[12px] bg-white/5 px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-white/10"
            >
              Transactions
              <ChevronRight className="h-4 w-4 text-[#8fa3c8]" />
            </button>
            <button
              type="button"
              onClick={() => openQuickAction(() => onOpenProfile("trading_history"))}
              className="flex w-full items-center justify-between rounded-[12px] bg-white/5 px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-white/10"
            >
              Trades
              <ChevronRight className="h-4 w-4 text-[#8fa3c8]" />
            </button>
            <button
              type="button"
              onClick={() => openQuickAction(() => onOpenProfile("personal"))}
              className="flex w-full items-center justify-between rounded-[12px] bg-white/5 px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-white/10"
            >
              My account
              <ChevronRight className="h-4 w-4 text-[#8fa3c8]" />
            </button>
          </div>
        </div>

        <div className="border-t border-white/5 p-3" style={{ background: "hsl(228 20% 12%)" }}>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isSigningOut}
            className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-[13px] font-bold text-red-300 transition-colors hover:bg-red-500/15 hover:text-white disabled:opacity-60"
          >
            <LogOut className="h-4 w-4" />
            {isSigningOut ? "Logging out..." : "Log out"}
          </button>
        </div>
      </div>
    </>
  );
};
