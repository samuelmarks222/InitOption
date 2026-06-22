import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BadgeCheck, CircleHelp, Clock3, ShieldCheck, Smartphone, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";

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
import { getEffectiveLiveBalance, getReservedWithdrawalBalance, getStoredLiveBalance } from "@/lib/live-balance";
import { requestMobileMoneyDeposit, type MobileMoneyDepositPayload } from "@/lib/mobileMoney";
import { convertUsdToKesDepositAmount } from "@/lib/mobileMoneyShared";
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
  const amountKes = convertUsdToKesDepositAmount(amountValue);

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
  const storedLiveBalance = getStoredLiveBalance(profile);
  const availableLiveBalance = getEffectiveLiveBalance(profile);
  const reservedWithdrawalBalance = getReservedWithdrawalBalance(profile);

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
    <div className="min-h-screen overflow-x-hidden bg-[#0f1624] text-white">
      <div className="border-b border-white/10 bg-[#121927]/95">
        <div className="mx-auto flex min-h-[64px] w-full max-w-[1360px] flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-5">
            <SiteLogo to="/" variant="dark" imageClassName="h-9 sm:h-10" />
            <div className="hidden h-8 w-px bg-white/12 sm:block" />
            <Link to="/trade" className="flex w-fit items-center gap-2 text-sm text-white/86 transition-colors hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Back to Trading
            </Link>
          </div>
        </div>
      </div>

      <form onSubmit={handleDeposit} className="mx-auto grid w-full max-w-[1360px] gap-0 lg:grid-cols-[480px,minmax(0,1fr)]">
        <aside className="border-b border-white/10 px-5 py-8 sm:px-6 lg:min-h-[calc(100vh-65px)] lg:border-b-0 lg:border-r lg:border-white/10 lg:px-8 lg:py-12">
          <div className="mx-auto w-full max-w-[320px] space-y-9 lg:mx-0 lg:ml-auto">
            <section>
              <div className="flex items-center justify-between">
                <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#aab5c6]">Payment method</div>
                <span className="rounded-full border border-[#22b978]/30 bg-[#22b978]/8 px-2.5 py-0.5 text-[10px] font-bold text-[#35d891]">Fast & Secure</span>
              </div>
              <div className="text-sm font-extrabold uppercase tracking-[0.08em] text-white">Choose a payment method</div>
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  onClick={() => handleSelectMethod("mpesa")}
                  className={`group flex w-full items-center gap-4 rounded-xl border-2 px-4 py-3.5 transition-all duration-200 ${
                    selectedMethod === "mpesa"
                      ? "border-[#22b978] bg-[linear-gradient(135deg,rgba(34,185,120,0.15)_0%,rgba(34,185,120,0.05)_100%)] shadow-[0_0_0_1px_rgba(34,185,120,0.3),0_8px_24px_rgba(34,185,120,0.12)]"
                      : "border-white/10 bg-white/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:border-[#22b978]/40 hover:bg-white/[0.09]"
                  }`}
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] shadow-inner">
                    <img src="/payment-logos/mpesa.png" alt="M-PESA" className="h-8 w-8 object-contain" />
                  </span>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-bold text-white">M-PESA</div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#35d891]">Mobile Money</div>
                  </div>
                  <svg className="h-4 w-4 text-white/30" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3L11 8L6 13" /></svg>
                </button>

                <button
                  type="button"
                  disabled={cryptoMethods.length === 0}
                  onClick={() => handleSelectMethod("crypto")}
                  className={`group flex w-full items-center gap-4 rounded-xl border-2 px-4 py-3.5 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-55 ${
                    selectedMethod === "crypto"
                      ? "border-[#2f8cff] bg-[linear-gradient(135deg,rgba(47,140,255,0.15)_0%,rgba(47,140,255,0.05)_100%)] shadow-[0_0_0_1px_rgba(47,140,255,0.3),0_8px_24px_rgba(47,140,255,0.12)]"
                      : "border-white/10 bg-white/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:border-[#2f8cff]/40 hover:bg-white/[0.09]"
                  }`}
                >
                  <span className="flex h-11 w-20 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] shadow-inner">
                    <div className="relative flex w-full items-center justify-center">
                      <img src="/payment-logos/bitcoin.png" alt="BTC" className="relative z-10 h-8 w-8 rounded-full border-2 border-[#1a2232] object-contain" />
                      <img src="/payment-logos/usdt.png" alt="USDT" className="relative -ml-3 z-20 h-8 w-8 rounded-full border-2 border-[#1a2232] object-contain" />
                      <img src="/payment-logos/binance.png" alt="BNB" className="relative -ml-3 z-30 h-8 w-8 rounded-full border-2 border-[#1a2232] object-contain" />
                    </div>
                  </span>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-bold text-white">Cryptocurrency</div>
                    <div className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#5ea8ff]">Choose coin</div>
                  </div>
                  <svg className="h-4 w-4 text-white/30" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 3L11 8L6 13" /></svg>
                </button>
              </div>
              {cryptoMethods.length === 0 ? (
                <p className="mt-3 text-xs leading-5 text-[#8ea0b7]">Cryptocurrency deposits are temporarily unavailable right now.</p>
              ) : null}
            </section>

            <section>
              <div className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#aab5c6]">Account snapshot</div>
              <div className="mt-4 rounded-xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.01)_100%)] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] text-white/80">Live Balance</div>
                    <div className="mt-1 text-2xl font-bold text-white">${storedLiveBalance.toFixed(2)}</div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[#19b872]/30 bg-[#19b872]/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#35d891]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#35d891]" />
                    Live
                  </span>
                </div>
                {reservedWithdrawalBalance > 0 ? (
                  <p className="mt-3 border-t border-white/8 pt-3 text-xs leading-5 text-[#96a8c0]">
                    ${availableLiveBalance.toFixed(2)} available &middot; ${reservedWithdrawalBalance.toFixed(2)} reserved
                  </p>
                ) : null}
              </div>
            </section>
          </div>
        </aside>

        <main className="px-5 py-8 sm:px-8 lg:px-9 lg:py-12 xl:px-10">
          <div className="mx-auto w-full max-w-[690px] lg:mx-0">
            <div>
              <h1 className="text-[32px] font-bold leading-tight text-white sm:text-[38px]">Top Up Your Balance</h1>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-[minmax(0,1fr)_310px] md:items-start">
              <div className="min-w-0">
                <label className="text-sm font-medium text-white">Amount (USD)</label>
                <div className="mt-2 flex min-h-[44px] overflow-hidden rounded-lg border border-[#39445a] bg-[#202838] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                  <div className="flex shrink-0 items-center gap-2 border-r border-[#39445a] px-3">
                    <span className="relative h-6 w-6 overflow-hidden rounded-full bg-white shadow-[0_0_0_1px_rgba(255,255,255,0.22)]">
                      <span className="absolute inset-0 bg-[repeating-linear-gradient(to_bottom,#c63b3b_0_2px,#ffffff_2px_4px)]" />
                      <span className="absolute left-0 top-0 h-[52%] w-[46%] bg-[#23477f]" />
                    </span>
                    <span className="text-base font-bold text-white">USD</span>
                  </div>
                  <input
                    type="number"
                    step="1"
                    value={amount}
                    onChange={(event) => handleAmountChange(event.target.value)}
                    placeholder={`Enter amount (Min $${minimumDepositAmount})`}
                    className="min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-[#8c96a9]"
                  />
                </div>
              </div>

              <div className="flex min-w-0 items-start gap-3 pt-0 md:pt-[28px]">
                <button
                  type="button"
                  role="switch"
                  aria-checked={bonusEnabled}
                  aria-disabled={!hasEligibleBonusOffers}
                  onClick={() => {
                    if (!hasEligibleBonusOffers) return;
                    setBonusEnabled((current) => !current);
                  }}
                  className={`relative mt-0.5 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${
                    bonusEnabled && hasEligibleBonusOffers ? "bg-[#20be7a]" : "bg-white/18"
                  } ${!hasEligibleBonusOffers ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <span
                    className={`inline-block h-5 w-5 rounded-full bg-white shadow transition ${
                      bonusEnabled && hasEligibleBonusOffers ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">Activate bonus</span>
                    <CircleHelp className="h-4 w-4 text-[#8fa0b7]" />
                  </div>
                  <p className="mt-2 text-sm leading-5 text-[#a6b2c5]">
                    {bonusEnabled && bonusPercent > 0
                      ? `${bonusPercent}% bonus applied to this amount range`
                      : hasEligibleBonusOffers
                        ? "Enter any amount and the matching range bonus will apply automatically"
                        : bonusAvailabilityCopy}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6">
              {loadingBonuses ? <div className="mb-3 text-xs text-[#8fa0b7]">Refreshing offers...</div> : null}

              {/* Bonus header */}
              {resolvedBonusCatalog.length > 0 && (
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Available Bonus Tiers</h3>
                    <p className="mt-0.5 text-xs text-[#8fa0b7]">
                      {bonusEnabled && bonusPercent > 0
                        ? `${bonusPercent}% bonus applied`
                        : "Tap a tier to jump to its starting amount"}
                    </p>
                  </div>
                </div>
              )}

              {loadingBonuses ? null : resolvedBonusCatalog.filter((o) => o.eligible).length === 0 ? (
                <div className="rounded-lg border border-white/10 bg-[#202838] px-4 py-3 text-sm text-[#aab6c8]">
                  {bonusAvailabilityCopy}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {resolvedBonusCatalog.filter((o) => o.eligible).map((offer) => {
                    const isSelected = appliedBonusOffer?.id === offer.id;
                    const offerMatchesCurrentAmount = doesDepositAmountMatchBonusOffer({ amount: amountValue, offer });
                    const previewAmount = offerMatchesCurrentAmount ? amountValue : resolveDepositBonusOfferMinimumAmount(offer);
                    const currentBonusAmount = calculateDepositBonusAmountFromOffer({ amount: previewAmount, offer });
                    const projectedCredit = previewAmount + currentBonusAmount;
                    const rangeLabel = formatDepositBonusOfferRange({ offer }).replace(/\$/g, "");
                    const bonusPct = Number(offer.bonus_percent ?? 0);

                    return (
                      <button
                        key={offer.id}
                        type="button"
                        onClick={() => handleSelectBonusOffer(offer)}
                        className={`group relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                          isSelected
                            ? "border-[#f59e0b] bg-[linear-gradient(135deg,rgba(245,158,11,0.18)_0%,rgba(217,119,6,0.08)_100%)] shadow-[0_0_0_1px_rgba(245,158,11,0.35),0_16px_40px_rgba(217,119,6,0.15)]"
                            : "border-white/15 bg-[linear-gradient(135deg,rgba(58,65,81,0.9)_0%,rgba(48,55,72,0.95)_100%)] hover:border-[#f59e0b]/50 hover:shadow-[0_8px_30px_rgba(245,158,11,0.08)]"
                        }`}
                      >
                        {/* Glow effect */}
                        <div
                          className={`pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 transition-opacity duration-300 ${
                            isSelected ? "opacity-60" : "group-hover:opacity-30"
                          }`}
                          style={{
                            background:
                              "radial-gradient(circle, rgba(245,158,11,0.25) 0%, transparent 70%)",
                          }}
                        />

                        <div className="relative z-[1]">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="block text-[11px] font-bold uppercase tracking-[0.1em] text-[#fbbf24]">
                                {rangeLabel}
                              </span>
                              <span className="mt-1 block text-xl font-extrabold text-white">USD</span>
                            </div>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-extrabold tracking-wide ${
                                isSelected
                                  ? "bg-[#f59e0b]/20 text-[#fbbf24]"
                                  : "bg-white/10 text-[#c5ccd8]"
                              }`}
                            >
                              <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                                <path d="M6 0L7.35 4.65L12 6L7.35 7.35L6 12L4.65 7.35L0 6L4.65 4.65L6 0Z" fill="currentColor" />
                              </svg>
                              {bonusPct}% bonus
                            </span>
                          </div>

                          <div className="mt-3 flex items-end justify-between">
                            <div>
                              <p className="text-[11px] font-medium text-[#8fa0b7]">Projected credit</p>
                              <p className="text-sm font-bold text-white">
                                {offerMatchesCurrentAmount
                                  ? `${projectedCredit.toFixed(2)} $`
                                  : `From ${projectedCredit.toFixed(2)} $`}
                              </p>
                            </div>
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-[#fbbf24] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5">
                              <svg className="h-3.5 w-3.5" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 1L11 7L5 13" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedMethod === "mpesa" ? (
              <div className="mt-7">
                <label className="text-sm font-medium text-white">M-PESA number</label>
                <div className="mt-2 flex min-h-[44px] items-center rounded-lg border border-[#39445a] bg-[#202838] px-4 focus-within:border-[#20be7a]/70">
                  <input
                    type="tel"
                    value={mpesaPhoneNumber}
                    onChange={(event) => setMpesaPhoneNumber(event.target.value)}
                    placeholder="e.g., 0712345678 or 254712345678"
                    className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#8c96a9]"
                  />
                  <img src="/payment-logos/mpesa.png" alt="M-PESA" className="ml-3 h-7 w-[58px] shrink-0 object-contain" />
                </div>
              </div>
            ) : null}

            {selectedMethod === "crypto" ? (
              <div className="mt-7 rounded-lg border border-white/12 bg-[#202838] px-4 py-4 text-sm leading-6 text-[#c7d0df]">
                {selectedCryptoMethod
                  ? `${selectedCryptoMethod.coin_name} checkout will open after you press Next.`
                  : "Cryptocurrency deposits are temporarily unavailable right now."}
              </div>
            ) : null}

            <div className="mt-5 grid gap-4 rounded-lg border border-white/12 bg-[#202838] px-4 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(160px,220px)]">
              <div>
                <div className="text-sm text-white">Mobile money charge</div>
                <div className="mt-1 text-lg font-bold text-white">{selectedMethod === "mpesa" ? formatCurrencyAmount(amountKes, "KES") : "0.00 $"}</div>
                <p className="mt-1 max-w-[360px] text-xs leading-4 text-[#8fa0b7]">
                  {selectedMethod === "mpesa"
                    ? "M-PESA requests the KES equivalent and the platform credits the USD amount."
                    : "Crypto network charges are handled on the hosted checkout page."}
                </p>
              </div>
              <div className="border-white/12 sm:border-l sm:pl-5 sm:text-right">
                <div className="text-sm text-white">Will be credited</div>
                <div className="mt-1 text-lg font-bold text-white">{receiveAmount.toFixed(2)} $</div>
                <p className="mt-1 text-xs leading-4 text-[#8fa0b7]">
                  {bonusEnabled && bonusAmount > 0 ? `${amountValue.toFixed(2)} $ + ${bonusAmount.toFixed(2)} $ bonus` : "Base deposit only"}
                </p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={
                loading ||
                !amount ||
                amountValue < minimumDepositAmount ||
                (selectedMethod === "mpesa" && !mpesaPhoneNumber.trim()) ||
                (selectedMethod === "crypto" && !selectedCryptoMethod)
              }
              className="mt-5 h-12 w-full rounded-lg bg-[#20be7a] text-base font-bold text-white shadow-[0_14px_32px_rgba(32,190,122,0.28)] transition hover:bg-[#28c985] disabled:cursor-not-allowed disabled:bg-[#20be7a] disabled:text-white/85 disabled:opacity-100"
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

            <p className="mt-3 text-center text-sm leading-5 text-[#a6b2c5]">
              {selectedMethod === "mpesa"
                ? "Instructions for your Send Payment Prompt will appear after submission."
                : "After you click Next, you will choose the cryptocurrency on the payment page."}
            </p>

            {selectedMethod === "mpesa" && lastMobileMoneyRequest ? (
              <div className={`mt-5 overflow-hidden rounded-lg ${mobileMoneyStatusTone.cardClassName}`}>
                <div className="flex flex-col gap-4 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${mobileMoneyStatusTone.iconClassName}`}>
                      <MobileMoneyStatusIcon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="text-sm font-bold text-white">{mobileMoneyStatusTone.title}</div>
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${mobileMoneyStatusTone.badgeClassName}`}>
                          {mobileMoneyStatusTone.label}
                        </span>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-white/90">{mobileMoneyStatusTone.description}</p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-lg border border-white/10 bg-black/10 px-4 py-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/65">Phone</div>
                      <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-white">
                        <Smartphone className="h-4 w-4 text-white/70" />
                        {lastMobileMoneyRequest.masked_phone_number}
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/10 px-4 py-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/65">KES request</div>
                      <div className="mt-2 text-sm font-semibold text-white">
                        {formatCurrencyAmount(lastMobileMoneyKesAmount || amountKes, "KES")}
                      </div>
                    </div>

                    <div className="rounded-lg border border-white/10 bg-black/10 px-4 py-3">
                      <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-white/65">USD credit</div>
                      <div className="mt-2 text-sm font-semibold text-white">
                        {(lastMobileMoneyUsdAmount || receiveAmount).toFixed(2)} $
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </main>
      </form>
    </div>
  );
};

export default Deposit;
