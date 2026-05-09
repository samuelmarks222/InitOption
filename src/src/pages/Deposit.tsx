import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BadgeCheck, CircleHelp, Clock3, Minus, Plus, ShieldCheck, Smartphone, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MpesaIcon } from "@/components/ui/MpesaIcon";
import { toast } from "@/hooks/use-toast";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { createCryptoDepositInstruction, isAutomatedCryptoMode } from "@/lib/cryptoDeposits";
import {
  buildDepositBonusCatalog,
  calculateDepositBonusAmountFromOffer,
  calculateDepositCreditedAmount,
  doesDepositAmountMatchBonusOffer,
  findMatchingDepositBonusOffer,
  formatDepositBonusOfferRange,
  resolveDepositBonusOfferMinimumAmount,
  type DepositBonusCatalogEntry,
  type DepositBonusOffer,
  type DepositBonusRedemption,
} from "@/lib/depositBonusOffers";
import { formatCurrencyAmount } from "@/lib/currency";
import { requestMobileMoneyDeposit, type MobileMoneyDepositPayload } from "@/lib/mobileMoney";
import { convertUsdToKesAmount } from "@/lib/mobileMoneyShared";
import { isPlisioSupportedCryptoMethod } from "@/lib/plisio";

type CryptoPaymentMethod = Tables<"crypto_payment_methods">;
type FundingMethod = "mpesa" | "crypto";
type MobileMoneyRequestMonitorStatus = "idle" | "pending" | "approved" | "rejected";

const MOBILE_MONEY_PENDING_REQUEST_STORAGE_KEY = "pending_mobile_money_deposit_request";

const getCryptoAutomationPriority = (method: Pick<CryptoPaymentMethod, "attribution_mode">) => {
  if (method.attribution_mode === "dynamic_address") return 0;
  if (method.attribution_mode === "memo") return 1;
  return 2;
};

const GENERIC_CRYPTO_ICONS = [
  "https://assets.coincap.io/assets/icons/btc@2x.png",
  "https://assets.coincap.io/assets/icons/eth@2x.png",
  "https://assets.coincap.io/assets/icons/usdt@2x.png",
  "https://assets.coincap.io/assets/icons/bnb@2x.png",
];

const GenericCryptoMethodBadge = () => (
  <div className="flex shrink-0 items-center">
    {GENERIC_CRYPTO_ICONS.map((icon, index) => (
      <span
        key={icon}
        className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-[#22364a] bg-white"
        style={{ marginLeft: index === 0 ? 0 : -8, zIndex: 10 - index }}
      >
        <img src={icon} alt="" className="h-7 w-7 rounded-full object-cover" />
      </span>
    ))}
  </div>
);

const Deposit = () => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [amount, setAmount] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [loadingBonuses, setLoadingBonuses] = useState(true);
  const [bonusEnabled, setBonusEnabled] = useState(true);
  const [selectedBonusOfferId, setSelectedBonusOfferId] = useState<string>("");
  const [selectedMethod, setSelectedMethod] = useState<FundingMethod>("mpesa");
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState("");
  const [lastMobileMoneyRequest, setLastMobileMoneyRequest] = useState<MobileMoneyDepositPayload | null>(null);
  const [cryptoMethods, setCryptoMethods] = useState<CryptoPaymentMethod[]>([]);
  const [selectedCryptoId, setSelectedCryptoId] = useState<string>("");
  const [bonusOffers, setBonusOffers] = useState<DepositBonusOffer[]>([]);
  const [bonusRedemptions, setBonusRedemptions] = useState<Pick<DepositBonusRedemption, "bonus_offer_id" | "created_at" | "status">[]>([]);
  const [mobileMoneyMonitorStatus, setMobileMoneyMonitorStatus] = useState<MobileMoneyRequestMonitorStatus>("idle");
  const redirectTimeoutRef = useRef<number | null>(null);
  const handledMobileMoneyResolutionRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const savedRequest = window.sessionStorage.getItem(MOBILE_MONEY_PENDING_REQUEST_STORAGE_KEY);
      if (!savedRequest) return;

      const parsedRequest = JSON.parse(savedRequest) as MobileMoneyDepositPayload;
      if (parsedRequest?.request_id) {
        setLastMobileMoneyRequest(parsedRequest);
        setSelectedMethod("mpesa");
      }
    } catch {
      window.sessionStorage.removeItem(MOBILE_MONEY_PENDING_REQUEST_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!lastMobileMoneyRequest?.request_id) {
      window.sessionStorage.removeItem(MOBILE_MONEY_PENDING_REQUEST_STORAGE_KEY);
      return;
    }

    window.sessionStorage.setItem(
      MOBILE_MONEY_PENDING_REQUEST_STORAGE_KEY,
      JSON.stringify(lastMobileMoneyRequest),
    );
  }, [lastMobileMoneyRequest]);

  useEffect(() => {
    let cancelled = false;

    const fetchCrypto = async () => {
      const { data, error } = await supabase
        .from("crypto_payment_methods")
        .select("*")
        .eq("status", "active")
        .order("coin_name");

      if (cancelled || error) {
        return;
      }

      const sortedMethods = (data ?? [])
        .filter(
          (entry) =>
            isAutomatedCryptoMode(entry.attribution_mode) &&
            isPlisioSupportedCryptoMethod({ network: entry.network, symbol: entry.symbol }),
        )
        .sort((left, right) => {
          const automationDiff = getCryptoAutomationPriority(left) - getCryptoAutomationPriority(right);
          if (automationDiff !== 0) return automationDiff;
          return left.coin_name.localeCompare(right.coin_name);
        });

      setCryptoMethods(sortedMethods);
      setSelectedCryptoId((current) =>
        current && sortedMethods.some((entry) => entry.id === current) ? current : sortedMethods[0]?.id ?? "",
      );
    };

    void fetchCrypto();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setBonusOffers([]);
      setBonusRedemptions([]);
      setLoadingBonuses(false);
      return;
    }

    let cancelled = false;

    const fetchBonuses = async () => {
      setLoadingBonuses(true);

      const [offersResponse, redemptionsResponse] = await Promise.all([
        supabase
          .from("deposit_bonus_offers")
          .select("*")
          .eq("status", "active")
          .order("position", { ascending: true })
          .order("deposit_amount", { ascending: true }),
        supabase
          .from("deposit_bonus_redemptions")
          .select("bonus_offer_id, created_at, status")
          .eq("user_id", user.id),
      ]);

      if (cancelled) {
        return;
      }

      if (offersResponse.error) {
        toast({
          title: "Deposit bonuses unavailable",
          description: offersResponse.error.message,
          variant: "destructive",
        });
        setBonusOffers([]);
      } else {
        setBonusOffers((offersResponse.data ?? []) as DepositBonusOffer[]);
      }

      if (redemptionsResponse.error) {
        toast({
          title: "Bonus history unavailable",
          description: redemptionsResponse.error.message,
          variant: "destructive",
        });
        setBonusRedemptions([]);
      } else {
        setBonusRedemptions(
          (redemptionsResponse.data ?? []) as Pick<DepositBonusRedemption, "bonus_offer_id" | "created_at" | "status">[],
        );
      }

      setLoadingBonuses(false);
    };

    void fetchBonuses();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const amountValue = Number(amount) || 0;
  const selectedCryptoMethod = cryptoMethods.find((entry) => entry.id === selectedCryptoId) ?? null;
  const minimumDepositAmount =
    selectedMethod === "mpesa"
      ? 5
      : Math.max(Number(selectedCryptoMethod?.minimum_deposit_amount ?? 10), 10);
  const amountKes = convertUsdToKesAmount(amountValue);

  const resolvedBonusCatalog = useMemo(
    () =>
      buildDepositBonusCatalog({
        offers: bonusOffers,
        redemptions: bonusRedemptions,
        totalDeposit: Number(profile?.total_deposit ?? 0),
      }),
    [bonusOffers, bonusRedemptions, profile?.total_deposit],
  );

  const selectedBonusOffer = useMemo(
    () => resolvedBonusCatalog.find((offer) => offer.id === selectedBonusOfferId) ?? null,
    [resolvedBonusCatalog, selectedBonusOfferId],
  );

  const matchedBonusOffer = useMemo(
    () => findMatchingDepositBonusOffer({ amount: amountValue, offers: resolvedBonusCatalog }),
    [amountValue, resolvedBonusCatalog],
  );

  const selectedBonusOfferMatchesAmount =
    selectedBonusOffer?.eligible && doesDepositAmountMatchBonusOffer({ amount: amountValue, offer: selectedBonusOffer });

  const appliedBonusOffer: DepositBonusCatalogEntry | null = bonusEnabled
    ? (selectedBonusOfferMatchesAmount ? selectedBonusOffer : matchedBonusOffer)
    : null;

  const bonusAmount = bonusEnabled && appliedBonusOffer
    ? calculateDepositBonusAmountFromOffer({ amount: amountValue, offer: appliedBonusOffer })
    : 0;
  const bonusPercent = bonusEnabled ? Number(appliedBonusOffer?.bonus_percent ?? 0) : 0;
  const receiveAmount = calculateDepositCreditedAmount({
    amount: amountValue,
    bonusEnabled,
    selectedOffer: appliedBonusOffer,
  });

  const hasEligibleBonusOffers = resolvedBonusCatalog.some((offer) => offer.eligible);
  useEffect(() => {
    if (!resolvedBonusCatalog.some((offer) => offer.id === selectedBonusOfferId)) {
      setSelectedBonusOfferId("");
    }
  }, [resolvedBonusCatalog, selectedBonusOfferId]);

  useEffect(() => {
    if (!hasEligibleBonusOffers) {
      setBonusEnabled(false);
      setSelectedBonusOfferId("");
    }
  }, [hasEligibleBonusOffers]);

  useEffect(() => {
    if (!user?.id || !lastMobileMoneyRequest?.request_id) {
      setMobileMoneyMonitorStatus("idle");
      handledMobileMoneyResolutionRef.current = null;
      return;
    }

    let active = true;
    const requestId = lastMobileMoneyRequest.request_id;
    setMobileMoneyMonitorStatus("pending");

    const handleResolvedDepositStatus = (
      nextStatusRaw: string | null | undefined,
      creditedAmount?: number | null,
      requestAmount?: number | null,
    ) => {
      const nextStatus = String(nextStatusRaw ?? "").toLowerCase();

      if (!active || (nextStatus !== "approved" && nextStatus !== "rejected")) {
        return;
      }

      const handledKey = `${requestId}:${nextStatus}`;
      if (handledMobileMoneyResolutionRef.current === handledKey) {
        return;
      }

      handledMobileMoneyResolutionRef.current = handledKey;
      setMobileMoneyMonitorStatus(nextStatus);

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(MOBILE_MONEY_PENDING_REQUEST_STORAGE_KEY);
      }

      if (nextStatus === "approved") {
        const resolvedAmount = Number(creditedAmount ?? requestAmount ?? amountValue) || amountValue;

        showDepositStatusToast({
          title: "Deposit confirmed",
          badge: "Completed",
          description: `${resolvedAmount.toFixed(2)} $ credited successfully. Returning to the trading area now.`,
          icon: BadgeCheck,
          tone: "success",
        });
        void refreshProfile();

        if (redirectTimeoutRef.current) {
          window.clearTimeout(redirectTimeoutRef.current);
        }

        redirectTimeoutRef.current = window.setTimeout(() => {
          navigate("/trade", { replace: true });
        }, 1400);
        return;
      }

      setLastMobileMoneyRequest(null);
      showDepositStatusToast({
        title: "Deposit failed",
        badge: "Not completed",
        description: "The M-PESA payment was not completed. Send a fresh payment prompt and try again.",
        icon: XCircle,
        tone: "failure",
      });
    };

    const syncDepositRequestStatus = async () => {
      const { data, error } = await supabase
        .from("deposit_requests")
        .select("status, credited_amount, amount")
        .eq("id", requestId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active || error || !data) {
        return;
      }

      handleResolvedDepositStatus(data.status, data.credited_amount, data.amount);
    };

    const channel = supabase
      .channel(`deposit-request-${requestId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "deposit_requests", filter: `id=eq.${requestId}` },
        (payload) => {
          const nextRow = payload.new as {
            amount?: number | null;
            credited_amount?: number | null;
            status?: string | null;
          };

          handleResolvedDepositStatus(nextRow.status, nextRow.credited_amount, nextRow.amount);
        },
      )
      .subscribe();

    void syncDepositRequestStatus();
    const pollInterval = window.setInterval(() => {
      void syncDepositRequestStatus();
    }, 5000);

    return () => {
      active = false;
      window.clearInterval(pollInterval);
      void supabase.removeChannel(channel);
    };
  }, [amountValue, lastMobileMoneyRequest?.request_id, navigate, refreshProfile, user?.id]);

  const handleSelectMethod = (method: FundingMethod) => {
    setSelectedMethod(method);

    if (method === "crypto") {
      setLastMobileMoneyRequest(null);
    }
  };

  const openHostedCheckout = (checkoutUrl: string | null | undefined) => {
    if (!checkoutUrl) {
      toast({
        title: "Checkout link unavailable",
        description: "This deposit was created, but the payment link is no longer available on this device.",
        variant: "destructive",
      });
      return;
    }

    window.location.assign(checkoutUrl);
  };

  const handleAdjustAmount = (direction: -1 | 1) => {
    const stepAmount = amountValue >= 300 ? 50 : amountValue >= 150 ? 25 : 10;
    const baseAmount = amountValue > 0 ? amountValue : minimumDepositAmount;
    const nextAmount = Math.max(minimumDepositAmount, baseAmount + stepAmount * direction);

    if (selectedBonusOffer && !doesDepositAmountMatchBonusOffer({ amount: nextAmount, offer: selectedBonusOffer })) {
      setSelectedBonusOfferId("");
    }

    setAmount(nextAmount);
  };

  const handleAmountChange = (value: string) => {
    if (value === "") {
      setAmount("");
      setSelectedBonusOfferId("");
      return;
    }

    const nextAmount = Number(value);
    if (!Number.isFinite(nextAmount)) {
      return;
    }

    if (selectedBonusOffer && !doesDepositAmountMatchBonusOffer({ amount: nextAmount, offer: selectedBonusOffer })) {
      setSelectedBonusOfferId("");
    }

    setAmount(nextAmount);
  };

  const handleSelectBonusOffer = (offer: DepositBonusCatalogEntry) => {
    if (!offer.eligible) {
      return;
    }

    setBonusEnabled(true);
    setSelectedBonusOfferId(offer.id);
    setAmount(resolveDepositBonusOfferMinimumAmount(offer));
  };

  const handleDeposit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!user || !profile || !amount || Number(amount) <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    if (amountValue < minimumDepositAmount) {
      toast({
        title: "Deposit amount too low",
        description:
          selectedMethod === "mpesa"
            ? "Minimum M-PESA deposit is $5.00."
            : `Minimum deposit is $${minimumDepositAmount.toFixed(2)} for the current crypto checkout.`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (selectedMethod === "mpesa") {
        const mobileMoneyRequest = await requestMobileMoneyDeposit({
          amount: Number(amount),
          bonusOfferId: bonusEnabled ? appliedBonusOffer?.id ?? null : null,
          phoneNumber: mpesaPhoneNumber,
        });

        handledMobileMoneyResolutionRef.current = null;
        setMobileMoneyMonitorStatus("pending");
        setLastMobileMoneyRequest(mobileMoneyRequest);
        showDepositStatusToast({
          title: "M-PESA prompt sent",
          badge: "Awaiting approval",
          description:
            mobileMoneyRequest.customer_message ||
            mobileMoneyRequest.detail ||
            `Approve the payment prompt on ${mobileMoneyRequest.masked_phone_number}.`,
          icon: Clock3,
          tone: "pending",
        });
        return;
      }

      if (!selectedCryptoMethod) {
        toast({ title: "Choose a crypto method", variant: "destructive" });
        return;
      }

      const instruction = await createCryptoDepositInstruction({
        amount: Number(amount),
        bonusOfferId: bonusEnabled ? appliedBonusOffer?.id ?? null : null,
        paymentMethodId: selectedCryptoMethod.id,
      });

      openHostedCheckout(instruction.hosted_checkout_url);
      return;
    } catch (error) {
      showDepositStatusToast({
        title: "Deposit failed",
        badge: "Action needed",
        description: error instanceof Error ? error.message : "Something went wrong while submitting the deposit request.",
        icon: XCircle,
        tone: "failure",
      });
    } finally {
      setLoading(false);
    }
  };

  const automationCopy =
    selectedMethod === "mpesa"
      ? "Choose M-PESA, enter the amount and phone number, then confirm the payment prompt on that device."
      : !selectedCryptoMethod
        ? "Cryptocurrency deposits are temporarily unavailable right now."
        : "Choose cryptocurrency here, set the amount, optionally attach a bonus offer, then press Next to continue.";

  const bonusAvailabilityCopy = hasEligibleBonusOffers
    ? "The matching bonus tier is applied from the amount you enter, and you can tap any tier below to jump to its starting amount."
    : resolvedBonusCatalog.length > 0
      ? "All currently active bonus offers on this account have already been used."
      : "No deposit bonus offers are available right now.";

  const fundingToastClassName =
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
      className: fundingToastClassName,
    });
  };

  const lastMobileMoneyUsdAmount = Number(lastMobileMoneyRequest?.amount_usd ?? 0);
  const lastMobileMoneyKesAmount = Number(lastMobileMoneyRequest?.amount_kes ?? 0);

  const MobileMoneyStatusIcon =
    mobileMoneyMonitorStatus === "approved"
      ? BadgeCheck
      : mobileMoneyMonitorStatus === "rejected"
        ? XCircle
        : mobileMoneyMonitorStatus === "pending"
          ? Clock3
          : ShieldCheck;

  const mobileMoneyStatusTone =
    mobileMoneyMonitorStatus === "approved"
      ? {
          badgeClassName: "border-emerald-200/35 bg-emerald-300/18 text-emerald-50",
          cardClassName:
            "border border-emerald-300/30 bg-[linear-gradient(135deg,rgba(55,163,114,0.24)_0%,rgba(25,61,70,0.96)_55%,rgba(14,26,40,0.98)_100%)] text-emerald-50",
          iconClassName: "bg-emerald-300/16 text-emerald-100",
          label: "Confirmed",
          title: "Deposit received",
          description: "Your payment has cleared successfully. The credited funds are now reflected on your balance and the page is taking you back to trading.",
        }
      : mobileMoneyMonitorStatus === "rejected"
        ? {
            badgeClassName: "border-red-200/30 bg-red-300/14 text-red-100",
            cardClassName:
              "border border-red-300/25 bg-[linear-gradient(135deg,rgba(152,33,53,0.3)_0%,rgba(66,18,29,0.95)_50%,rgba(14,26,40,0.98)_100%)] text-red-50",
            iconClassName: "bg-red-300/14 text-red-100",
            label: "Not completed",
            title: "Deposit needs a new prompt",
            description: "The M-PESA payment did not complete successfully. Send a fresh payment prompt and approve it again on the same phone.",
          }
        : {
            badgeClassName: "border-emerald-200/30 bg-emerald-300/14 text-emerald-50",
            cardClassName:
              "border border-emerald-300/28 bg-[linear-gradient(135deg,rgba(55,163,114,0.22)_0%,rgba(25,61,70,0.96)_52%,rgba(14,26,40,0.98)_100%)] text-emerald-50",
            iconClassName: "bg-emerald-300/14 text-emerald-100",
            label: mobileMoneyMonitorStatus === "pending" ? "Awaiting approval" : "Secured",
            title: "Payment prompt sent",
            description:
              lastMobileMoneyRequest?.customer_message ||
              lastMobileMoneyRequest?.detail ||
              "Approve the STK push on your M-PESA phone to complete this deposit.",
          };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,#1c1f2d_0%,#1e2330_42%,#1c1f2d_100%)] p-3 text-white sm:p-4 md:p-8">
      <div className="mx-auto mt-4 w-full max-w-[1220px] space-y-5 sm:mt-6 sm:space-y-6 md:mt-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
          <SiteLogo to="/" subtitle="Secure funding" />
          <Link to="/trade" className="flex w-fit items-center gap-2 text-[#9ab7c9] transition-colors hover:text-white">
            <ArrowLeft className="h-5 w-5" />
            Back to Trading
          </Link>
        </div>

        <Card className="overflow-hidden border border-[#1e2330] bg-[#1c1f2d] shadow-[0_24px_80px_rgba(0,0,0,0.36)]">
          <CardHeader className="border-b border-white/8 bg-[linear-gradient(180deg,rgba(30,35,48,0.96)_0%,rgba(28,31,45,0.98)_100%)] px-4 py-5 sm:px-5 sm:py-6 md:px-8">
            <div className="text-[12px] font-black uppercase tracking-[0.18em] text-[#8eb3bf]">Funding desk</div>
            <CardTitle className="mt-2 text-2xl text-white sm:text-3xl md:text-4xl">Top up your balance</CardTitle>
            <CardDescription className="mt-2 max-w-[780px] text-sm leading-6 text-[#9dc2c8]">
              Choose the payment method, enter the amount, attach any available bonus, and continue to payment.
            </CardDescription>
          </CardHeader>

          <CardContent className="px-4 py-5 sm:px-5 sm:py-6 md:px-8 md:py-8">
            <form onSubmit={handleDeposit} className="grid gap-6 xl:grid-cols-[340px,minmax(0,1fr)]">
              <div className="space-y-6">
                <div className="rounded-[22px] border border-[#1e2330] bg-[#1e2330] p-5 text-sm leading-6 text-slate-200">
                  {automationCopy}
                </div>

                <div className="rounded-[22px] border border-white/8 bg-[#1e2330] p-5">
                  <label className="text-[12px] font-black uppercase tracking-[0.18em] text-[#8eb3bf]">Select payment method</label>
                  <div className="mt-4 grid gap-3">
                    <button
                      type="button"
                      onClick={() => handleSelectMethod("mpesa")}
                      className={`flex flex-col items-start gap-3 rounded-[18px] border p-4 text-left transition sm:flex-row sm:items-center sm:gap-4 ${
                        selectedMethod === "mpesa"
                          ? "border-[#0fa053]/60 bg-[#1e2330] shadow-[0_12px_26px_rgba(15,160,83,0.2)]"
                          : "border-white/10 bg-[#1e2330] hover:border-white/20"
                      }`}
                    >
                      <MpesaIcon className="h-9 w-[84px] shrink-0 sm:h-10 sm:w-[92px]" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold leading-tight text-white sm:text-[15px]">M-PESA Mobile Money</div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#9dc2c8]">Pay from your phone</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      disabled={cryptoMethods.length === 0}
                      onClick={() => handleSelectMethod("crypto")}
                      className={`flex flex-col items-start gap-3 rounded-[18px] border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 sm:flex-row sm:items-center sm:gap-4 ${
                        selectedMethod === "crypto"
                          ? "border-white/12 bg-[#1e2330] shadow-[0_12px_26px_rgba(255,255,255,0.04)]"
                          : "border-white/10 bg-[#1e2330] hover:border-white/20"
                      }`}
                    >
                      <GenericCryptoMethodBadge />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-bold leading-tight text-white sm:text-[15px]">Cryptocurrency</div>
                        <div className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#9dc2c8]">Choose coin on next step</div>
                      </div>
                    </button>
                  </div>
                  <p className="mt-3 text-xs leading-5 text-[#9dc2c8]">
                    {selectedMethod === "mpesa"
                      ? "M-PESA charges the exact KES equivalent of the USD amount you choose here."
                      : "After you press Next, you will choose the cryptocurrency on the payment page."}
                  </p>
                </div>

                {cryptoMethods.length === 0 && (
                  <div className="rounded-[22px] border border-[#1e2330] bg-[#1e2330] p-5 text-sm leading-6 text-slate-200">
                    Cryptocurrency deposits are temporarily unavailable right now.
                  </div>
                )}

                <div className="rounded-[22px] border border-white/8 bg-[#1e2330] p-5">
                  <div className="text-[12px] font-black uppercase tracking-[0.18em] text-[#8eb3bf]">Account snapshot</div>
                  <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <div className="text-sm text-[#9dc2c8]">Current Balance</div>
                      <div className="mt-2 break-all text-3xl font-bold text-white">${profile?.balance?.toFixed(2) || "0.00"}</div>
                    </div>
                    <div className="rounded-full bg-[#0fa053]/12 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#0fa053]">
                      Live account
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="text-sm font-medium text-white">Amount (USD)</label>
                  <div className="rounded-[22px] border border-border bg-[#1e2330] p-4 shadow-[0_20px_48px_rgba(0,0,0,0.18)]">
                    <div className="flex flex-col gap-4 rounded-[16px] bg-[#1e2330] p-4 lg:flex-row lg:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="shrink-0 text-[18px] font-black text-[#0fa053] sm:text-[22px]">USD</span>
                        <input
                          type="number"
                          step="1"
                          value={amount}
                          onChange={(event) => handleAmountChange(event.target.value)}
                          placeholder={`Enter amount (Min $${minimumDepositAmount})`}
                          className="min-w-0 w-full bg-transparent text-[22px] font-bold text-white outline-none placeholder:text-slate-500 sm:text-[26px]"
                        />
                      </div>

                      <div className="min-w-0 text-left lg:min-w-[124px] lg:text-right">
                        <div className="text-sm font-bold text-[#ff9a3d]">
                          {bonusEnabled && bonusAmount > 0 ? `+${bonusAmount.toFixed(2)} $` : "Bonus off"}
                        </div>
                        <div className="text-[11px] uppercase tracking-[0.16em] text-[#a7bdd9]">
                          {bonusEnabled && bonusPercent > 0 ? `${bonusPercent}% reward` : "Base deposit"}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start lg:self-auto">
                        <button
                          type="button"
                          onClick={() => handleAdjustAmount(-1)}
                          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/15"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustAmount(1)}
                          className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/15"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-3 rounded-[16px] bg-[#1e2330] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <button
                          type="button"
                          role="switch"
                          aria-checked={bonusEnabled}
                          aria-disabled={!hasEligibleBonusOffers}
                          onClick={() => {
                            if (!hasEligibleBonusOffers) return;
                            setBonusEnabled((current) => !current);
                          }}
                          className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
                            bonusEnabled && hasEligibleBonusOffers
                              ? "border-[#ff9a3d]/70 bg-[#ff9a3d]"
                              : "border-white/12 bg-white/10"
                          } ${!hasEligibleBonusOffers ? "cursor-not-allowed opacity-60" : ""}`}
                        >
                          <span
                            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
                              bonusEnabled && hasEligibleBonusOffers ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>

                        <div className="min-w-0">
                          <div className="font-semibold text-[#ffc27a]">Activate bonus</div>
                          <div className="break-words text-xs leading-5 text-[#a7bdd9]">
                            {bonusEnabled && bonusPercent > 0
                              ? `${bonusPercent}% bonus applied for the current amount range`
                              : hasEligibleBonusOffers
                              ? "Enter any amount and the matching range bonus will apply automatically"
                              : bonusAvailabilityCopy}
                          </div>
                        </div>
                      </div>

                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-[#a7bdd9]">
                        <CircleHelp className="h-4 w-4" />
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        <div className="text-sm font-medium text-white">Available deposit bonuses</div>
                        {loadingBonuses ? <div className="text-xs text-[#9dc2c8]">Refreshing offers...</div> : null}
                      </div>

                      {resolvedBonusCatalog.length === 0 ? (
                        <div className="mt-3 rounded-[16px] border border-white/8 bg-[#1e2330] px-4 py-4 text-sm text-[#9dc2c8]">
                          No deposit bonus offers are available right now.
                        </div>
                      ) : (
                        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {resolvedBonusCatalog.map((offer) => {
                            const isSelected = appliedBonusOffer?.id === offer.id;
                            const offerMatchesCurrentAmount = doesDepositAmountMatchBonusOffer({ amount: amountValue, offer });
                            const previewAmount = offerMatchesCurrentAmount ? amountValue : resolveDepositBonusOfferMinimumAmount(offer);
                            const currentBonusAmount = calculateDepositBonusAmountFromOffer({ amount: previewAmount, offer });
                            const projectedCredit = previewAmount + currentBonusAmount;
                            const badgeLabel = offer.eligible ? `+${Number(offer.bonus_percent ?? 0)}%` : "USED";
                            const rangeLabel = formatDepositBonusOfferRange({ offer });
                            const maximumBonusAmount = Number(offer.maximum_bonus_amount_resolved ?? 0);

                            return (
                              <button
                                key={offer.id}
                                type="button"
                                disabled={!offer.eligible}
                                onClick={() => handleSelectBonusOffer(offer)}
                                className={`rounded-[16px] border px-4 py-4 text-left transition ${
                                  isSelected
                                    ? "border-[#ff9a3d] bg-[#1e2330] text-white shadow-[0_16px_26px_rgba(255,154,61,0.18)]"
                                    : offer.eligible
                                      ? "border-transparent bg-[#1e2330] text-white hover:border-[#ffc27a]/40"
                                      : "border-white/5 bg-[#1e2330] text-white/60"
                                } ${!offer.eligible ? "cursor-not-allowed opacity-80" : ""}`}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <span className="min-w-0 break-words text-base font-bold sm:text-lg">{rangeLabel.replace(/\$/g, "")} USD</span>
                                  <span
                                    className={`rounded-[10px] px-2.5 py-1 text-xs font-bold ${
                                      isSelected
                                        ? "bg-[#ff9a3d] text-[#1c1f2d]"
                                        : offer.eligible
                                          ? "bg-[#1e2330] text-[#ff9a3d]"
                                          : "bg-white/10 text-white/70"
                                    }`}
                                  >
                                    {badgeLabel}
                                  </span>
                                </div>
                                <div className={`mt-3 break-words text-xs leading-5 ${isSelected ? "text-white/90" : offer.eligible ? "text-[#a7bdd9]" : "text-white/55"}`}>
                                  {offer.eligible
                                    ? offerMatchesCurrentAmount
                                      ? `${projectedCredit.toFixed(2)} $ credited at this amount`
                                      : `From ${projectedCredit.toFixed(2)} $ credited`
                                    : offer.reason ?? "Unavailable"}
                                </div>
                                {offer.eligible && maximumBonusAmount > 0 ? (
                                  <div className={`mt-1 text-[11px] ${isSelected ? "text-white/80" : "text-[#87a5c3]"}`}>
                                    Max bonus {maximumBonusAmount.toFixed(2)} $
                                  </div>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedMethod === "mpesa" ? (
                  <div className="rounded-[22px] border border-white/8 bg-[#1e2330] p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <MpesaIcon className="h-8 w-[74px] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">M-PESA number</div>
                        <div className="text-xs text-[#9dc2c8]">Enter the phone number that will receive the STK prompt.</div>
                      </div>
                    </div>
                    <input
                      type="tel"
                      value={mpesaPhoneNumber}
                      onChange={(event) => setMpesaPhoneNumber(event.target.value)}
                      placeholder="e.g. 0712345678 or 254712345678"
                      className="mt-4 w-full rounded-[16px] border border-white/10 bg-[#1e2330] px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-500 focus:border-[#0fa053]/60"
                    />
                    <div className="mt-4 rounded-[16px] border border-white/8 bg-[#1e2330] p-4">
                      <div className="flex flex-col gap-2 text-sm text-[#9dc2c8] sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                        <span>Mobile money charge</span>
                        <span className="break-all font-semibold text-white">{formatCurrencyAmount(amountKes, "KES")}</span>
                      </div>
                      <div className="mt-2 text-xs leading-5 text-[#9dc2c8]">
                        The exact KES equivalent is requested on M-PESA, then the platform credits the USD amount shown here.
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="grid gap-4">
                  <div className="rounded-[22px] border border-white/8 bg-[#1e2330] px-5 py-4">
                    <div className="text-sm font-medium text-white">Will be credited</div>
                    <div className="text-xs leading-5 text-[#9dc2c8]">
                      {bonusEnabled && bonusAmount > 0
                        ? `${amountValue.toFixed(2)} $ + ${bonusAmount.toFixed(2)} $ bonus`
                        : "Base deposit only"}
                    </div>
                    <div className="mt-3 text-2xl font-bold text-white">{receiveAmount.toFixed(2)} $</div>
                  </div>
                </div>

                <div className="rounded-[22px] border border-white/8 bg-[#1e2330] p-5">
                  <Button
                    type="submit"
                    disabled={
                      loading ||
                      !amount ||
                      amountValue < minimumDepositAmount ||
                      (selectedMethod === "mpesa" && !mpesaPhoneNumber.trim()) ||
                      (selectedMethod === "crypto" && !selectedCryptoMethod)
                    }
                    className="w-full px-4 py-5 text-base gradient-primary sm:py-6 sm:text-lg"
                  >
                    {loading
                      ? selectedMethod === "mpesa"
                        ? "Sending payment prompt..."
                        : "Opening payment page..."
                      : selectedMethod === "mpesa"
                        ? "Send Payment Prompt"
                        : !selectedCryptoMethod
                          ? "Select payment method first"
                          : "Next"}
                  </Button>
                  <p className="mt-4 text-center text-xs leading-5 text-[#9dc2c8]">
                    {selectedMethod === "mpesa"
                      ? "Approve the prompt on your M-PESA phone, and the platform will update automatically after the payment clears."
                      : "After you click Next, you will choose the cryptocurrency on the payment page."}
                  </p>
                  {selectedMethod === "mpesa" && lastMobileMoneyRequest ? (
                    <div className={`mt-4 overflow-hidden rounded-[18px] ${mobileMoneyStatusTone.cardClassName}`}>
                      <div className="flex flex-col gap-4 p-4 sm:p-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${mobileMoneyStatusTone.iconClassName}`}>
                            <MobileMoneyStatusIcon className="h-5 w-5" />
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="text-sm font-bold text-white">{mobileMoneyStatusTone.title}</div>
                              <span
                                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] ${mobileMoneyStatusTone.badgeClassName}`}
                              >
                                {mobileMoneyStatusTone.label}
                              </span>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-white/90">{mobileMoneyStatusTone.description}</p>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-[16px] border border-white/10 bg-black/10 px-4 py-3">
                            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-white/65">Phone</div>
                            <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-white">
                              <Smartphone className="h-4 w-4 text-white/70" />
                              {lastMobileMoneyRequest.masked_phone_number}
                            </div>
                          </div>

                          <div className="rounded-[16px] border border-white/10 bg-black/10 px-4 py-3">
                            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-white/65">KES request</div>
                            <div className="mt-2 text-sm font-semibold text-white">
                              {formatCurrencyAmount(lastMobileMoneyKesAmount || amountKes, "KES")}
                            </div>
                          </div>

                          <div className="rounded-[16px] border border-white/10 bg-black/10 px-4 py-3">
                            <div className="text-[11px] font-black uppercase tracking-[0.16em] text-white/65">USD credit</div>
                            <div className="mt-2 text-sm font-semibold text-white">
                              {(lastMobileMoneyUsdAmount || receiveAmount).toFixed(2)} $
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default Deposit;
