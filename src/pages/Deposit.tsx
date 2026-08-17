import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BadgeCheck, CircleHelp, Clock3, Loader2, ShieldCheck, Smartphone, XCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { realtime } from "@/integrations/pusher/realtime";
import { api } from "@/integrations/api/client";
import { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";

import { toast } from "@/hooks/use-toast";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  createPlisioHostedCheckoutDeposit,
  getCryptoDepositPaymentStatus,
  getPlisioMethodMinimums,
  isCryptoDepositCompleted,
  isCryptoDepositFailed,
  PENDING_CRYPTO_CHECKOUT_STORAGE_KEY,
  PlisioMethodMinimumInfo,
} from "@/lib/cryptoDeposits";
import { requestMobileMoneyDeposit } from "@/lib/mobileMoney";
import { isPlisioSupportedCryptoMethod } from "@/lib/plisio";

type CryptoPaymentMethod = Tables<"crypto_payment_methods">;
type FundingMethod = "mpesa" | "crypto";
type MobileMoneyRequestMonitorStatus = "idle" | "pending" | "approved" | "rejected";

const MOBILE_MONEY_PENDING_REQUEST_STORAGE_KEY = "pending_mobile_money_deposit_request";

const formatUsd = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return "—";
  return `$${value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatCoinAmount = (value: number | null | undefined) => {
  if (value == null || !Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 100000) return value.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (Math.abs(value) >= 1) return value.toLocaleString("en-US", { maximumFractionDigits: 6 });
  return value.toLocaleString("en-US", { maximumSignificantDigits: 6 });
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
  const [bonusOffers, setBonusOffers] = useState<DepositBonusOffer[]>([]);
  const [bonusRedemptions, setBonusRedemptions] = useState<Pick<DepositBonusRedemption, "bonus_offer_id" | "created_at" | "status">[]>([]);
  const [mobileMoneyMonitorStatus, setMobileMoneyMonitorStatus] = useState<MobileMoneyRequestMonitorStatus>("idle");
  const redirectTimeoutRef = useRef<number | null>(null);
  const handledMobileMoneyResolutionRef = useRef<string | null>(null);

  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "opening" | "waiting" | "completed" | "failed">("idle");

  // Crypto selection states for improved UX
  const [selectedCoin, setSelectedCoin] = useState<string>("USDT");
  const [selectedCoinNetwork, setSelectedCoinNetwork] = useState<string>("TRC20");
  const [plisioInfos, setPlisioInfos] = useState<PlisioMethodMinimumInfo[]>([]);
  const [plisioMinLoading, setPlisioMinLoading] = useState(false);

  // M-PESA status display
  const isMpesaPending = lastMobileMoneyRequest?.request_id && mobileMoneyMonitorStatus === "pending";
  const isMpesaApproved = mobileMoneyMonitorStatus === "approved";
  const isMpesaRejected = mobileMoneyMonitorStatus === "rejected";

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const savedRequest = window.sessionStorage.getItem(MOBILE_MONEY_PENDING_REQUEST_STORAGE_KEY);
    if (!savedRequest) return;
    const parsed = JSON.parse(savedRequest);
    if (parsed?.request_id) {
      setLastMobileMoneyRequest(parsed);
      setSelectedMethod("mpesa");
    }
  }, []);

  useEffect(() => {
    if (!lastMobileMoneyRequest?.request_id) {
      window.sessionStorage.removeItem(MOBILE_MONEY_PENDING_REQUEST_STORAGE_KEY);
    }
  }, [lastMobileMoneyRequest]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = window.sessionStorage.getItem(MOBILE_MONEY_PENDING_REQUEST_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (parsed?.request_id) {
        setLastMobileMoneyRequest(parsed);
        setSelectedMethod("mpesa");
      }
    } catch {
      window.sessionStorage.removeItem(MOBILE_MONEY_PENDING_REQUEST_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const fetchCrypto = async () => {
      const { data, error } = await api
        .from("crypto_payment_methods")
        .select("*")
        .eq("status", "active")
        .order("coin_name");
      if (cancelled || error) return;
      setCryptoMethods(data ?? []);
    };
    void fetchCrypto();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (cryptoMethods.length === 0) return;
    let cancelled = false;
    setPlisioMinLoading(true);
    void getPlisioMethodMinimums({ methods: cryptoMethods }).then((infos) => {
      if (cancelled) return;
      setPlisioInfos(infos);
      setPlisioMinLoading(false);
    });
    return () => { cancelled = true; };
  }, [cryptoMethods]);

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
      const [offersRes, redemptionsRes] = await Promise.all([
        api.from("deposit_bonus_offers").select("*").eq("status", "active").order("position", { ascending: true }),
        api.from("deposit_bonus_redemptions").select("bonus_offer_id, created_at, status").eq("user_id", user.id),
      ]);
      if (cancelled) return;
      if (offersRes.error) {
        toast({ title: "Deposit bonuses unavailable", variant: "destructive" });
        setBonusOffers([]);
      } else {
        setBonusOffers(offersRes.data ?? []);
      }
      if (redemptionsRes.error) {
        toast({ title: "Bonus history unavailable", variant: "destructive" });
        setBonusRedemptions([]);
      } else {
        setBonusRedemptions(redemptionsRes.data ?? []);
      }
      setLoadingBonuses(false);
    };
    void fetchBonuses();
    return () => { cancelled = true; };
  }, [user?.id]);

  const amountValue = Number(amount) || 0;
  // Only offer coin/network combos Plisio can actually process (excludes coins not
  // in Plisio's supported list like XRP, coins in maintenance, and coins not enabled
  // in the shop). When Plisio data is unavailable, fall back to the full DB list.
  const supportedCryptoMethods = useMemo(() => {
    if (plisioInfos.length === 0) return cryptoMethods;
    return cryptoMethods.filter((m) =>
      plisioInfos.some(
        (info) =>
          info.symbol.toUpperCase() === m.symbol.toUpperCase() &&
          info.network.toUpperCase() === m.network.toUpperCase() &&
          info.hiddenInShop !== true,
      ),
    );
  }, [cryptoMethods, plisioInfos]);
  const cryptoCoinOptions = useMemo(
    () => Array.from(new Set(supportedCryptoMethods.map((m) => m.symbol))),
    [supportedCryptoMethods],
  );
  const cryptoNetworkOptions = useMemo(
    () => supportedCryptoMethods.filter((m) => m.symbol === selectedCoin).map((m) => m.network),
    [supportedCryptoMethods, selectedCoin],
  );
  const selectedCryptoMethod =
    supportedCryptoMethods.find((e) => e.symbol === selectedCoin && e.network === selectedCoinNetwork) ?? supportedCryptoMethods[0] ?? null;
  const plisioSelectedInfo = useMemo(
    () =>
      plisioInfos.find(
        (info) =>
          info.symbol.toUpperCase() === selectedCoin.toUpperCase() &&
          info.network.toUpperCase() === selectedCoinNetwork.toUpperCase(),
      ) ?? null,
    [plisioInfos, selectedCoin, selectedCoinNetwork],
  );
  const symbolIcons = useMemo(() => {
    const map: Record<string, string | null> = {};
    for (const info of plisioInfos) {
      if (map[info.symbol.toUpperCase()] === undefined && info.icon) {
        map[info.symbol.toUpperCase()] = info.icon;
      }
    }
    return map;
  }, [plisioInfos]);
  const cryptoMinimumUsd =
    plisioSelectedInfo?.minAmountUsd ?? Math.max(Number(selectedCryptoMethod?.minimum_deposit_amount ?? 10), 10);
  const minimumDepositAmount = selectedMethod === "mpesa" ? 5 : cryptoMinimumUsd;

  useEffect(() => {
    if (supportedCryptoMethods.length === 0) return;
    const symbols = Array.from(new Set(supportedCryptoMethods.map((m) => m.symbol)));
    if (!symbols.includes(selectedCoin)) {
      setSelectedCoin(symbols[0] ?? "USDT");
    }
    const networks = supportedCryptoMethods.filter((m) => m.symbol === selectedCoin).map((m) => m.network);
    if (networks.length > 0 && !networks.includes(selectedCoinNetwork)) {
      setSelectedCoinNetwork(networks[0]);
    }
  }, [supportedCryptoMethods, selectedCoin, selectedCoinNetwork]);

  const syncCryptoCheckoutStatus = async () => {
    let saved: { instruction_id?: string } | null = null;
    try {
      saved = JSON.parse(window.sessionStorage.getItem(PENDING_CRYPTO_CHECKOUT_STORAGE_KEY) ?? "null");
    } catch {
      saved = null;
    }
    if (!saved?.instruction_id) return;
    try {
      const status = await getCryptoDepositPaymentStatus({ instructionId: saved.instruction_id });
      if (isCryptoDepositCompleted(status)) {
        setCheckoutStatus("completed");
        await refreshProfile();
        window.sessionStorage.removeItem(PENDING_CRYPTO_CHECKOUT_STORAGE_KEY);
      } else if (isCryptoDepositFailed(status)) {
        setCheckoutStatus("failed");
        window.sessionStorage.removeItem(PENDING_CRYPTO_CHECKOUT_STORAGE_KEY);
      } else {
        setCheckoutStatus("waiting");
      }
    } catch {
      // Ignore transient errors; keep polling.
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "plisio" && params.get("status") === "failed") {
      setCheckoutStatus("failed");
      window.sessionStorage.removeItem(PENDING_CRYPTO_CHECKOUT_STORAGE_KEY);
    }
    let active = true;
    const run = async () => {
      if (!active) return;
      await syncCryptoCheckoutStatus();
    };
    void run();
    const poll = window.setInterval(() => void run(), 6000);
    return () => {
      active = false;
      window.clearInterval(poll);
    };
  }, []);

  const hasEligibleBonusOffers = bonusOffers.some((o) => o.eligible);
  useEffect(() => {
    if (hasEligibleBonusOffers) {
      setBonusEnabled(true);
    }
  }, [hasEligibleBonusOffers]);

  useEffect(() => {
    if (!user?.id || !lastMobileMoneyRequest?.request_id) {
      setMobileMoneyMonitorStatus("idle");
      handledMobileMoneyResolutionRef.current = null;
      return;
    }
    let active = true;
    const reqId = lastMobileMoneyRequest.request_id;
    setMobileMoneyMonitorStatus("pending");
    const handleStatus = (status: string) => {
      if (!active) return;
      const lower = status.toLowerCase();
      if (lower === "approved" || lower === "rejected") {
        setMobileMoneyMonitorStatus(lower as any);
        if (lower === "approved") {
          refreshProfile();
          if (redirectTimeoutRef.current) window.clearTimeout(redirectTimeoutRef.current);
          redirectTimeoutRef.current = window.setTimeout(() => navigate("/trade", { replace: true }), 1400);
        } else {
          setLastMobileMoneyRequest(null);
        }
      }
    };
    const sync = async () => {
      const { data, error } = await api.from("deposit_requests").select("status, credited_amount, amount").eq("id", reqId).eq("user_id", user.id).maybeSingle();
      if (!active || !data) return;
      handleStatus(data.status);
    };
    const channel = realtime.channel(`deposit-request-${reqId}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "deposit_requests", filter: `id=eq.${reqId}` }, (p) => handleStatus(p.new?.status ?? '')).subscribe();
    void sync();
    const poll = window.setInterval(() => sync(), 5000);
    return () => { active = false; window.clearInterval(poll); void realtime.removeChannel(channel); };
  }, [amount, lastMobileMoneyRequest?.request_id, navigate, refreshProfile, user?.id]);

  const handleSelectMethod = (m: FundingMethod) => {
    setSelectedMethod(m);
    if (m === "crypto") setLastMobileMoneyRequest(null);
  };

  const handleAmountChange = (v: string) => {
    if (v === "") { setAmount(""); setSelectedBonusOfferId(""); return; }
    const n = Number(v);
    if (!Number.isFinite(n)) return;
    setAmount(n);
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile || !amount || Number(amount) <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }
    if (amountValue < minimumDepositAmount) {
      toast({ title: "Deposit amount too low", variant: "destructive" });
      return;
    }
    if (selectedMethod === "crypto" && plisioMinLoading) {
      toast({ title: "Checking the minimum deposit...", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      if (selectedMethod === "mpesa") {
        const mobileReq = await requestMobileMoneyDeposit({ amount: Number(amount), bonusOfferId: bonusEnabled ? undefined : null, phoneNumber: mpesaPhoneNumber });
        handledMobileMoneyResolutionRef.current = null;
        setMobileMoneyMonitorStatus("pending");
        setLastMobileMoneyRequest(mobileReq);
        return;
      }
      if (!selectedCryptoMethod) {
        toast({ title: "Choose a crypto method", variant: "destructive" });
        return;
      }
      const instr = await createPlisioHostedCheckoutDeposit({
        amount: Number(amount),
        paymentMethodId: selectedCryptoMethod.id,
        cryptoCurrency: selectedCryptoMethod.symbol,
        cryptoNetwork: selectedCryptoMethod.network,
      });
      window.sessionStorage.setItem(
        PENDING_CRYPTO_CHECKOUT_STORAGE_KEY,
        JSON.stringify({
          instruction_id: instr.instruction_id,
          amount: Number(amount),
          coin: selectedCryptoMethod.symbol,
          network: selectedCryptoMethod.network,
        }),
      );
      setCheckoutStatus("opening");
      if (instr.hosted_checkout_url) {
        window.location.href = instr.hosted_checkout_url;
      }
    } catch (err) {
      toast({ title: "Deposit failed", variant: "destructive", description: err instanceof Error ? err.message : "Error" });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#0f1624] text-white">
      <div className="border-b border-white/10 bg-[#121927]/95">
        <div className="mx-auto flex min-h-[64px] w-full max-w-[1360px] flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-5">
            <SiteLogo to="/" variant="dark" imageClassName="h-9 sm:h-10" />
            <Link to="/trade" className="flex w-fit items-center gap-2 text-sm text-white/86 hover:text-white">
              <ArrowLeft className="h-4 w-4" /> Back to Trading
            </Link>
          </div>
        </div>
      </div>

      <form onSubmit={handleDeposit} className="mx-auto grid w-full max-w-[1360px] gap-0 lg:grid-cols-[480px,minmax(0,1fr)]">
        <aside className="border-b border-white/10 px-5 py-8 sm:px-6 lg:min-h-[calc(100vh-65px)] lg:border-b-0 lg:border-r lg:border-white/10 lg:px-8 lg:py-12">
          <div className="mx-auto w-full max-w-[320px] space-y-9 lg:mx-0 lg:ml-auto">
            <div>
              <span className="text-[12px] font-bold uppercase tracking-[0.08em] text-[#aab5c6]">Payment method</span>
              <span className="rounded-full border border-[#22b978]/30 bg-[#22b978]/8 px-2.5 py-0.5 text-[10px] font-bold text-[#35d891]">Fast & Secure</span>
            </div>
            <span className="text-sm font-extrabold uppercase tracking-[0.08em] text-white">Choose a payment method</span>
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
                  <span className="text-sm font-bold text-white">M-PESA</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#35d891]">Mobile Money</span>
                </div>
              </button>
              <button
                type="button"
                disabled={supportedCryptoMethods.length === 0}
                onClick={() => handleSelectMethod("crypto")}
                className={`group flex w-full items-center gap-4 rounded-xl border-2 px-4 py-3.5 transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-55 ${
                  selectedMethod === "crypto"
                    ? "border-[#2f8cff] bg-[linear-gradient(135deg,rgba(47,140,255,0.15)_0%,rgba(47,140,255,0.05)_100%)] shadow-[0_0_0_1px_rgba(47,140,255,0.3),0_8px_24px_rgba(47,140,255,0.12)]"
                    : "border-white/10 bg-white/[0.06] shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:border-[#2f8cff]/40 hover:bg-white/[0.09]"
                }`}
              >
                <span className="flex h-11 w-20 shrink-0 items-center justify-center rounded-lg bg-white/[0.08] shadow-inner">
                  <img src="/payment-logos/bitcoin.png" alt="BTC" className="relative z-10 h-8 w-8 rounded-full border-2 border-[#1a2232] object-contain" />
                  <img src="/payment-logos/usdt.png" alt="USDT" className="relative -ml-3 z-20 h-8 w-8 rounded-full border-2 border-[#1a2232] object-contain" />
                  <img src="/payment-logos/binance.png" alt="BNB" className="relative -ml-3 z-30 h-8 w-8 rounded-full border-2 border-[#1a2232] object-contain" />
                </span>
                <div className="flex-1 text-left">
                  <span className="text-sm font-bold text-white">Cryptocurrency</span>
                  <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#5ea8ff]">Choose coin</span>
                </div>
              </button>
            </div>
            {supportedCryptoMethods.length === 0 ? (
              <p className="mt-3 text-xs leading-5 text-[#8ea0b7]">Cryptocurrency deposits are temporarily unavailable right now.</p>
            ) : null}
          </div>
        </aside>

        <main className="px-5 py-8 sm:px-8 lg:px-9 lg:py-12 xl:px-10">
          <div className="mx-auto w-full max-w-[690px] lg:mx-0">
            <h1 className="text-[32px] font-bold leading-tight text-white sm:text-[38px]">Top Up Your Balance</h1>
            <div className="mt-8 grid gap-4 md:grid-cols-[minmax(0,1fr)_310px] md:items-start">
              <div>
                <label className="text-sm font-medium text-white">Amount (USD)</label>
                <input
                  type="number"
                  step="1"
                  value={amount}
                  onChange={(e) => handleAmountChange(e.target.value)}
                  placeholder={`Enter amount (Min $${minimumDepositAmount})`}
                  className="min-w-0 flex-1 bg-transparent px-4 text-sm text-white outline-none placeholder:text-[#8c96a9]"
                />
              </div>
              <div>
                {selectedMethod === "mpesa" ? (
                  <div>
                    <label className="text-sm font-medium text-white">M-PESA number</label>
                    <input
                      type="tel"
                      value={mpesaPhoneNumber}
                      onChange={(e) => setMpesaPhoneNumber(e.target.value)}
                      placeholder="e.g., 0712345678 or 254712345678"
                      className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#8c96a9]" />
                    <img src="/payment-logos/mpesa.png" alt="M-PESA" className="ml-3 h-7 w-[58px] shrink-0 object-contain" />
                  </div>
                ) : null}
                {selectedMethod === "crypto" ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-white">Coin</label>
                      <Select value={selectedCoin} onValueChange={(v) => setSelectedCoin(v)}>
                        <SelectTrigger className="mt-1 w-full bg-[#0a0d17] border border-white/10 text-white">
                          <SelectValue placeholder="Select coin" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#141a2a] border border-white/10">
                          {cryptoCoinOptions.map((symbol) => (
                            <SelectItem key={symbol} value={symbol}>
                              <span className="flex items-center gap-2">
                                {symbolIcons[symbol.toUpperCase()] ? (
                                  <img
                                    src={symbolIcons[symbol.toUpperCase()]}
                                    alt=""
                                    className="h-5 w-5 rounded-full object-contain"
                                  />
                                ) : (
                                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-white/10 bg-white/10 text-xs font-bold text-white/80">
                                    {symbol.slice(0, 1)}
                                  </span>
                                )}
                                <span className="font-medium text-white">{symbol}</span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-white">Network</label>
                      <Select value={selectedCoinNetwork} onValueChange={(v) => setSelectedCoinNetwork(v)}>
                        <SelectTrigger className="mt-1 w-full bg-[#0a0d17] border border-white/10 text-white">
                          <SelectValue placeholder="Select network" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#141a2a] border border-white/10">
                          {cryptoNetworkOptions.map((net) => (
                            <SelectItem key={net} value={net}>
                              <span className="font-medium text-white">{net}</span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm">
                      <span className="text-white/50">Minimum deposit: </span>
                      {plisioMinLoading ? (
                        <span className="inline-flex items-center gap-1 text-white/70">
                          <Loader2 className="h-3 w-3 animate-spin" /> Checking...
                        </span>
                      ) : (
                        <span className="font-medium text-white">
                          {plisioSelectedInfo?.minAmountCoin != null
                            ? `${formatCoinAmount(plisioSelectedInfo.minAmountCoin)} ${selectedCoin}`
                            : formatUsd(cryptoMinimumUsd)}
                          <span className="text-white/50"> ≈ {formatUsd(cryptoMinimumUsd)}</span>
                        </span>
                      )}
                      {amountValue > 0 && amountValue < cryptoMinimumUsd ? (
                        <span className="mt-1 block text-amber-400">Increase your deposit amount to continue.</span>
                      ) : amountValue > 0 && amountValue >= cryptoMinimumUsd ? (
                        <span className="mt-1 block text-emerald-400">Minimum deposit requirement met</span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* M-PESA Status Panel */}
            {selectedMethod === "mpesa" && lastMobileMoneyRequest?.request_id && (
              <div className="mt-6 rounded-xl border bg-white/5 p-5">
                <div className="flex items-center gap-3">
                  {mobileMoneyMonitorStatus === "pending" && (
                    <div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/20">
                        <svg className="animate-spin h-6 w-6 text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white">Payment Request Sent</h3>
                        <p className="text-sm text-white/70 mt-1">Check your phone and enter your M-PESA PIN to complete the payment.</p>
                      </div>
                    </div>
                  )}
                  {mobileMoneyMonitorStatus === "approved" && (
                    <div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                        <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white">Deposit Successful</h3>
                        <p className="text-sm text-white/70 mt-1">Your account has been credited. Redirecting to trading...</p>
                      </div>
                    </div>
                  )}
                  {mobileMoneyMonitorStatus === "rejected" && (
                    <div>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                        <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white">Deposit Failed</h3>
                        <p className="text-sm text-white/70 mt-1">No funds were added to your account. Please try again.</p>
                      </div>
                    </div>
                  )}
                  {mobileMoneyMonitorStatus === "cancelled" && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-500/20">
                        <svg className="h-6 w-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white">Payment Cancelled</h3>
                        <p className="text-sm text-white/70 mt-1">The payment was cancelled. Please try again.</p>
                      </div>
                    </div>
                  )}
                </div>
                {mobileMoneyMonitorStatus === "pending" && lastMobileMoneyRequest ? (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-white/60">Amount</span>
                        <p className="font-bold text-white">${Number(lastMobileMoneyRequest.amount_usd).toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-white/60">M-PESA Amount</span>
                        <p className="font-bold text-white">{lastMobileMoneyRequest.amount_kes ? `${Number(lastMobileMoneyRequest.amount_kes).toLocaleString()} KES` : "—"}</p>
                      </div>
                      <div>
                        <span className="text-white/60">Phone</span>
                        <p className="font-bold text-white">{lastMobileMoneyRequest.masked_phone_number}</p>
                      </div>
                      <div>
                        <span className="text-white/60">Request ID</span>
                        <p className="font-bold text-white text-xs truncate">{lastMobileMoneyRequest.request_id}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {/* Crypto Hosted Checkout Panel */}
            {selectedMethod === "crypto" && checkoutStatus !== "idle" && (
              <div className="mt-6 rounded-xl border bg-white/5 p-5">
                {checkoutStatus === "opening" && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
                      <svg className="h-6 w-6 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-white">Redirecting to Plisio...</h3>
                      <p className="text-sm text-white/70 mt-1">
                        You'll complete the payment on Plisio's secure hosted checkout.
                      </p>
                    </div>
                  </div>
                )}
                {checkoutStatus === "waiting" && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-500/20">
                      <svg className="h-6 w-6 animate-spin text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-white">Payment Confirmation Pending</h3>
                      <p className="text-sm text-white/70 mt-1">
                        We're waiting for Plisio to confirm your payment. Your balance updates automatically once it's
                        confirmed on the blockchain.
                      </p>
                    </div>
                  </div>
                )}
                {checkoutStatus === "completed" && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                      <svg className="h-6 w-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-white">Deposit Successful</h3>
                      <p className="text-sm text-white/70 mt-1">Your account has been credited.</p>
                    </div>
                  </div>
                )}
                {checkoutStatus === "failed" && (
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
                      <svg className="h-6 w-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-white">Payment Not Received</h3>
                      <p className="text-sm text-white/70 mt-1">
                        No funds were added to your account. Please try again.
                      </p>
                    </div>
                  </div>
                )}
                {checkoutStatus === "waiting" ? (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-white/60">Amount</span>
                        <p className="font-bold text-white">${Number(amount).toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-white/60">Coin</span>
                        <p className="font-bold text-white">{selectedCoin}</p>
                      </div>
                      <div>
                        <span className="text-white/60">Network</span>
                        <p className="font-bold text-white">{selectedCoinNetwork}</p>
                      </div>
                      <div>
                        <span className="text-white/60">Status</span>
                        <p className="font-bold text-white text-yellow-400">Confirming...</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void syncCryptoCheckoutStatus()}
                      className="mt-4 h-11 w-full rounded-lg bg-white/10 text-sm font-bold text-white transition-colors hover:bg-white/20"
                    >
                      Check status
                    </button>
                  </div>
                ) : null}
                {checkoutStatus === "completed" ? (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => navigate("/trade", { replace: true })}
                      className="h-11 w-full rounded-lg bg-[#20be7a] text-sm font-bold text-white transition hover:bg-[#28c985]"
                    >
                      Go to Trading
                    </button>
                  </div>
                ) : null}
                {checkoutStatus === "failed" ? (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setCheckoutStatus("idle")}
                      className="h-11 w-full rounded-lg bg-white/10 text-sm font-bold text-white transition-colors hover:bg-white/20"
                    >
                      Try Again
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            <div className="mt-6">
              <Button
                type="submit"
                disabled={loading || !amount || amountValue < minimumDepositAmount || (selectedMethod === "mpesa" && !mpesaPhoneNumber.trim()) || !selectedCryptoMethod || (selectedMethod === "crypto" && plisioMinLoading)}
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
                      : "Continue to Payment"}
              </Button>
              <p className="mt-3 text-center text-sm leading-5 text-[#a6b2c5]">
                {selectedMethod === "mpesa"
                  ? "Instructions for your Send Payment Prompt will appear after submission."
                  : "You'll be redirected to Plisio's secure checkout to complete your deposit."}
              </p>
            </div>
          </div>
        </main>
      </form>
    </div>
  );
};

export default Deposit;