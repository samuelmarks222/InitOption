import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, CreditCard, Wallet, History, ArrowRight, ChevronDown, Loader2, AlertCircle, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/integrations/api/client";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ProgressSteps } from "./ProgressSteps";
import { 
  createPlisioHostedCheckoutDeposit,
  PENDING_CRYPTO_CHECKOUT_STORAGE_KEY,
  CryptoDepositInstructionPayload,
  CryptoPaymentMethodRecord 
} from "@/lib/cryptoDeposits";
import { 
  requestMobileMoneyDeposit, 
  MobileMoneyDepositPayload 
} from "@/lib/mobileMoney";
import { 
  requestCryptoWithdrawal, 
  requestMobileMoneyWithdrawal,
  MobileMoneyWithdrawalPayload,
  CryptoWithdrawalRequestPayload 
} from "@/lib/withdrawals";
import { getEffectiveLiveBalance } from "@/lib/live-balance";
import { formatCurrencyAmount } from "@/lib/currency";
import { DepositStep1 } from "./deposit/DepositStep1";
import { DepositMpesaDetails } from "./deposit/DepositMpesaDetails";
import { DepositCryptoDetails } from "./deposit/DepositCryptoDetails";
import { DepositMpesaProcess } from "./deposit/DepositMpesaProcess";
import { DepositCryptoProcess } from "./deposit/DepositCryptoProcess";
import { DepositSuccess } from "./deposit/DepositSuccess";
import { WithdrawStep1 } from "./withdraw/WithdrawStep1";
import { WithdrawMpesaDetails } from "./withdraw/WithdrawMpesaDetails";
import { WithdrawCryptoDetails } from "./withdraw/WithdrawCryptoDetails";
import { WithdrawReview } from "./withdraw/WithdrawReview";
import { WithdrawSuccess } from "./withdraw/WithdrawSuccess";

type PaymentTab = "deposit" | "withdraw" | "history";
type DepositStep = 1 | 2 | 3 | 4;
type WithdrawStep = 1 | 2 | 3 | 4;

const STEP_LABELS_DEPOSIT = ["Payment Method", "Payment Details", "Payment Process", "Completed"];
const STEP_LABELS_WITHDRAW = ["Withdrawal Method", "Withdrawal Details", "Review & Submit", "Completed"];

interface CryptoPaymentMethodUI {
  id: string;
  coin_name: string;
  symbol: string;
  network: string;
  minimum_deposit_amount: number;
  attribution_mode: string;
  wallet_address: string;
}

interface PaymentCenterProps {
  defaultTab?: "deposit" | "withdraw" | "history";
}

export const PaymentCenter = ({ defaultTab = "deposit" }: PaymentCenterProps) => {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw" | "history">(defaultTab);
  const [depositStep, setDepositStep] = useState<1 | 2 | 3 | 4>(1);
  const [withdrawStep, setWithdrawStep] = useState<1 | 2 | 3 | 4>(1);

  // Deposit state
  const [selectedDepositMethod, setSelectedDepositMethod] = useState<"mpesa" | "crypto" | null>(null);
  const [selectedDepositCoin, setSelectedDepositCoin] = useState<string>("USDT");
  const [selectedDepositNetwork, setSelectedDepositNetwork] = useState<string>("TRC20");
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [depositPhone, setDepositPhone] = useState("");
  const [depositBonusTier, setDepositBonusTier] = useState<number>(3);
  const [cryptoMethods, setCryptoMethods] = useState<CryptoPaymentMethodUI[]>([]);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositInstruction, setDepositInstruction] = useState<CryptoDepositInstructionPayload | null>(null);
  const [depositError, setDepositError] = useState<string | null>(null);
  const [depositStatus, setDepositStatus] = useState<"pending" | "approved" | "rejected" | "processing">("pending");

  // Withdrawal state
  const [selectedWithdrawMethod, setSelectedWithdrawMethod] = useState<"mpesa" | "crypto">("mpesa");
  const [withdrawCoin, setWithdrawCoin] = useState<string>("USDT");
  const [withdrawNetwork, setWithdrawNetwork] = useState<string>("TRC20");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawMemo, setWithdrawMemo] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Balance & History
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<"all" | "deposits" | "withdrawals" | "bonuses">("all");
  const [historySearch, setHistorySearch] = useState("");

  // Loading states
  const [balanceLoading, setBalanceLoading] = useState(true);
  const [cryptoMethodsLoading, setCryptoMethodsLoading] = useState(true);

  // Types
  type CryptoPaymentMethodUI = CryptoPaymentMethodRecord;
  type Transaction = {
    id: string;
    type: "deposit" | "withdrawal" | "bonus";
    method: string;
    amount: number;
    status: "completed" | "pending" | "processing" | "failed" | "rejected";
    date: string;
    coin?: string;
    network?: string;
    txHash?: string;
  };

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, [user?.id]);

  const loadInitialData = useCallback(async () => {
    if (!user?.id) return;
    
    setBalanceLoading(true);
    setCryptoMethodsLoading(true);
    
    try {
      await Promise.all([
        loadBalance(),
        loadCryptoMethods(),
        loadTransactions(),
      ]);
    } catch (error) {
      console.error("Failed to load initial data:", error);
    } finally {
      setBalanceLoading(false);
      setCryptoMethodsLoading(false);
    }
  }, [user?.id]);

  const loadBalance = async () => {
    if (!profile) return;
    const balance = getEffectiveLiveBalance(profile);
    setBalance(balance);
  };

  const loadCryptoMethods = async () => {
    try {
      const { data, error } = await api
        .from("crypto_payment_methods")
        .select("*")
        .eq("status", "active")
        .order("coin_name");
      
      if (!error && data) {
        setCryptoMethods(data as CryptoPaymentMethodUI[]);
        if (data[0]?.id && !selectedDepositMethod) {
          setSelectedDepositMethod("crypto");
        }
      }
    } catch (error) {
      console.error("Failed to load crypto methods:", error);
    }
  };

  const loadTransactions = async () => {
    if (!user?.id) return;
    
    setTransactionsLoading(true);
    try {
      const { data, error } = await api
        .from("transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (!error && data) {
        setTransactions(data as Transaction[]);
      }
    } catch (error) {
      console.error("Failed to load transactions:", error);
    } finally {
      setTransactionsLoading(false);
    }
  };

  // Refresh functions
  const refreshAll = async () => {
    await Promise.all([
      refreshProfile(),
      loadBalance(),
      loadTransactions(),
    ]);
  };

  const handleBack = () => {
    if (activeTab === "deposit" && depositStep > 1) {
      setDepositStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    } else if (activeTab === "withdraw" && withdrawStep > 1) {
      setWithdrawStep((prev) => (prev - 1) as 1 | 2 | 3 | 4);
    }
  };

  // Deposit handlers
  const handleDepositMethodSelect = (method: "mpesa" | "crypto") => {
    setSelectedDepositMethod(method);
    if (method === "crypto") {
      setSelectedDepositCoin("USDT");
      setSelectedDepositNetwork("TRC20");
    }
  };

  const handleDepositContinue = async () => {
    if (!selectedDepositMethod) return;
    
    if (selectedDepositMethod === "mpesa") {
      setDepositStep(2);
    } else if (selectedDepositMethod === "crypto") {
      setDepositStep(2);
    }
  };

  const handleDepositSubmit = async () => {
    if (!user || !profile || !depositAmount || Number(depositAmount) <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    const amountValue = Number(depositAmount);

    setDepositLoading(true);
    setDepositError(null);

    try {
      if (selectedDepositMethod === "mpesa") {
        if (!depositPhone.trim()) {
          toast({ title: "Enter M-PESA number", variant: "destructive" });
          return;
        }
        
        const response = await requestMobileMoneyDeposit({
          amount: amountValue,
          bonusOfferId: null,
          phoneNumber: depositPhone,
        });
        
        if (response.request_id) {
          setDepositStatus("pending");
          toast({ 
            title: "Payment Request Sent", 
            description: "Check your phone and enter your M-PESA PIN to complete the payment." 
          });
          setDepositStep(3); // Go to process step
        }
      } else if (selectedDepositMethod === "crypto") {
        if (!selectedDepositMethod) {
          toast({ title: "Choose a crypto method", variant: "destructive" });
          return;
        }

        // Find the payment method ID for the selected coin/network
        const paymentMethod = cryptoMethods.find(m =>
          m.symbol === selectedDepositCoin && m.network === selectedDepositNetwork
        );
        
        if (!paymentMethod) {
          toast({ title: "Invalid crypto method selected", variant: "destructive" });
          return;
        }

        const instruction = await createPlisioHostedCheckoutDeposit({
          amount: amountValue,
          paymentMethodId: paymentMethod.id,
          cryptoCurrency: selectedDepositCoin,
          cryptoNetwork: selectedDepositNetwork,
        });

        if (instruction.instruction_id) {
          window.sessionStorage.setItem(
            PENDING_CRYPTO_CHECKOUT_STORAGE_KEY,
            JSON.stringify({
              instruction_id: instruction.instruction_id,
              amount: amountValue,
              coin: selectedDepositCoin,
              network: selectedDepositNetwork,
            }),
          );
        }

        if (instruction.hosted_checkout_url) {
          setDepositInstruction(instruction);
          setDepositStep(3); // Go to process step (redirects to Plisio)
        }
      }
    } catch (error) {
      setDepositError(error instanceof Error ? error.message : "Deposit failed");
      toast({ title: "Deposit failed", description: error instanceof Error ? error.message : "Error", variant: "destructive" });
    } finally {
      setDepositLoading(false);
    }
  };

  // Withdrawal handlers
  const handleWithdrawMethodSelect = (method: "mpesa" | "crypto") => {
    setSelectedWithdrawMethod(method);
    if (method === "crypto") {
      setWithdrawCoin("USDT");
      setWithdrawNetwork("TRC20");
    }
  };

  const handleWithdrawContinue = () => {
    setWithdrawStep(2);
  };

  const handleWithdrawSubmit = async () => {
    if (!user || !profile || !withdrawAmount || Number(withdrawAmount) <= 0) {
      toast({ title: "Please enter a valid amount", variant: "destructive" });
      return;
    }

    const amountValue = Number(withdrawAmount);
    const availableBal = getEffectiveLiveBalance(profile);
    
    if (amountValue < 10) {
      toast({ title: "Withdrawal amount too low", description: "Minimum withdrawal is $10", variant: "destructive" });
      return;
    }

    if (amountValue > availableBal) {
      toast({ title: "Insufficient funds", variant: "destructive" });
      return;
    }

    setWithdrawLoading(true);
    setWithdrawError(null);

    try {
      if (selectedWithdrawMethod === "mpesa") {
        if (!withdrawPhone.trim()) {
          toast({ title: "Enter your M-PESA number", variant: "destructive" });
          return;
        }

        const response = await requestMobileMoneyWithdrawal({
          amount: amountValue,
          forfeitBonus: false,
          phoneNumber: withdrawPhone,
        });

        if (response.request_id) {
          toast({ title: "Withdrawal Request Submitted", description: "Your request is pending approval" });
          setWithdrawStep(4);
        }
      } else if (selectedWithdrawMethod === "crypto") {
        if (!withdrawCoin || !withdrawNetwork || !withdrawAddress.trim()) {
          toast({ title: "Please fill all required fields", variant: "destructive" });
          return;
        }

        const response = await requestCryptoWithdrawal({
          amount: amountValue,
          destination: withdrawAddress.trim(),
          cryptoCurrency: withdrawCoin,
          cryptoNetwork: withdrawNetwork,
          cryptoMemo: withdrawMemo,
          forfeitBonus: false,
        });

        if (response.request_id) {
          toast({ title: "Withdrawal Submitted", description: "Your crypto withdrawal is pending admin approval" });
          setWithdrawStep(4);
        }
      }
    } catch (error) {
      setWithdrawError(error instanceof Error ? error.message : "Withdrawal failed");
      toast({ title: "Withdrawal failed", description: error instanceof Error ? error.message : "Error", variant: "destructive" });
    } finally {
      setWithdrawLoading(false);
    }
  };

  const goToDepositStep = (step: 1 | 2 | 3 | 4) => setDepositStep(step);
  const goToWithdrawStep = (step: 1 | 2 | 3 | 4) => setWithdrawStep(step);

  // Computed values
  const availableBalance = getEffectiveLiveBalance({ ...profile, balance } as any);
  const minimumDepositAmount = selectedDepositMethod === "mpesa" ? 5 : 10;
  const amountValue = Number(depositAmount) || 0;
  const withdrawAmountValue = Number(withdrawAmount) || 0;

  const filteredCryptoMethods = cryptoMethods.filter(m => m.status === "active");

  return (
    <div className="min-h-screen bg-[#0a0e17] text-white">
      <header className="border-b border-white/10 bg-[#0f141f]/95 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-5 sm:px-8">
          <div className="flex items-center gap-4">
            <Link to="/trade" className="flex items-center gap-2 text-sm text-white/70 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" />
              Back to Trading
            </Link>
            <div className="h-6 w-px bg-white/10" />
            <SiteLogo to="/" variant="dark" imageClassName="h-8" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/50">Balance</span>
            <span className="font-bold text-lg text-white">${balance.toFixed(2)}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={async () => { await loadBalance(); await loadTransactions(); }}
              disabled={balanceLoading}
              className="ml-2 h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${balanceLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8">
        <nav className="mb-8" aria-label="Payment tabs">
          <div className="flex gap-2 bg-[#141a2a] rounded-xl p-1">
            {[
              { id: "deposit", label: "DEPOSIT", icon: Wallet },
              { id: "withdraw", label: "WITHDRAWAL", icon: CreditCard },
              { id: "history", label: "HISTORY", icon: History },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === "deposit") setDepositStep(1);
                  if (tab.id === "withdraw") setWithdrawStep(1);
                }}
                className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-[#1e293b] text-white shadow-lg shadow-[#0fa053]/20"
                    : "text-white/60 hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {activeTab === "deposit" && (
          <DepositFlow
            step={depositStep}
            onStepChange={setDepositStep}
            selectedMethod={selectedDepositMethod}
            setSelectedMethod={setSelectedDepositMethod}
            selectedCoin={selectedDepositCoin}
            setSelectedCoin={setSelectedDepositCoin}
            selectedNetwork={selectedDepositNetwork}
            setSelectedNetwork={setSelectedDepositNetwork}
            amount={depositAmount}
            setAmount={setDepositAmount}
            phone={depositPhone}
            setPhone={setDepositPhone}
            bonusTier={depositBonusTier}
            setBonusTier={setDepositBonusTier}
            cryptoMethods={filteredCryptoMethods}
            loading={depositLoading}
            error={depositError}
            instruction={depositInstruction}
            status={depositStatus}
            onMethodSelect={handleDepositMethodSelect}
            onContinue={handleDepositContinue}
            onSubmit={handleDepositSubmit}
            onBack={handleBack}
            minimumAmount={minimumDepositAmount}
          />
        )}

        {activeTab === "withdraw" && (
          <WithdrawFlow
            step={withdrawStep}
            onStepChange={setWithdrawStep}
            onBack={handleBack}
            selectedMethod={selectedWithdrawMethod}
            setSelectedMethod={setSelectedWithdrawMethod}
            coin={withdrawCoin}
            setCoin={setWithdrawCoin}
            network={withdrawNetwork}
            setNetwork={setWithdrawNetwork}
            amount={withdrawAmount}
            setAmount={setWithdrawAmount}
            address={withdrawAddress}
            setAddress={setWithdrawAddress}
            phone={withdrawPhone}
            setPhone={setWithdrawPhone}
            memo={withdrawMemo}
            setMemo={setWithdrawMemo}
            availableBalance={getEffectiveLiveBalance({ ...profile, balance } as any)}
            loading={withdrawLoading}
            error={withdrawError}
            onMethodSelect={handleWithdrawMethodSelect}
            onContinue={handleWithdrawContinue}
            onSubmit={handleWithdrawSubmit}
          />
        )}

        {activeTab === "history" && (
          <TransactionHistory
            transactions={transactions}
            loading={transactionsLoading}
            filter={historyFilter}
            setFilter={setHistoryFilter}
            search={historySearch}
            setSearch={setHistorySearch}
            onRefresh={loadTransactions}
          />
        )}
      </div>
    </div>
  );
};

// Deposit Flow Component
function DepositFlow({
  step,
  onStepChange,
  onBack,
  selectedMethod,
  setSelectedMethod,
  selectedCoin,
  setSelectedCoin,
  selectedNetwork,
  setSelectedNetwork,
  amount,
  setAmount,
  phone,
  setPhone,
  bonusTier,
  setBonusTier,
  cryptoMethods,
  loading,
  error,
  instruction,
  status,
  onMethodSelect,
  onContinue,
  onSubmit,
  minimumAmount,
}: any) {
  const progressLabels = ["Payment Method", "Payment Details", "Payment Process", "Completed"];

  return (
    <div className="max-w-4xl mx-auto">
      <ProgressSteps currentStep={step} labels={progressLabels} />

      <div className="mt-8">
        {step === 1 && (
          <DepositStep1
            selectedMethod={selectedMethod}
            onSelectMethod={onMethodSelect}
            onContinue={onContinue}
            onBack={onBack}
          />
        )}
        {step === 2 && selectedMethod === "mpesa" && (
          <DepositMpesaDetails
            amount={amount}
            setAmount={setAmount}
            phone={phone}
            setPhone={setPhone}
            bonusTier={bonusTier}
            setBonusTier={setBonusTier}
            onContinue={onSubmit}
            onBack={onBack}
          />
        )}
        {step === 2 && selectedMethod === "crypto" && (
          <DepositCryptoDetails
            selectedCoin={selectedCoin}
            setSelectedCoin={setSelectedCoin}
            selectedNetwork={selectedNetwork}
            setSelectedNetwork={setSelectedNetwork}
            amount={amount}
            setAmount={setAmount}
            cryptoMethods={cryptoMethods}
            onContinue={onSubmit}
            onBack={onBack}
          />
        )}
        {step === 3 && selectedMethod === "mpesa" && (
          <DepositMpesaProcess
            phone={phone}
            amount={amount}
            status={status}
            onBack={onBack}
            onComplete={() => onStepChange(4)}
          />
        )}
        {step === 3 && selectedMethod === "crypto" && (
          <DepositCryptoProcess
            coin={selectedCoin}
            network={selectedNetwork}
            amount={amount}
            instruction={instruction}
            onBack={onBack}
            onComplete={() => onStepChange(4)}
          />
        )}
        {step === 4 && (
          <DepositSuccess
            method={selectedMethod}
            coin={selectedCoin}
            network={selectedNetwork}
            amount={amount}
            onBackToTrading={() => window.location.href = "/trade"}
          />
        )}
      </div>
    </div>
  );
}

function WithdrawFlow({
  step,
  onStepChange,
  onBack,
  selectedMethod,
  setSelectedMethod,
  coin,
  setCoin,
  network,
  setNetwork,
  amount,
  setAmount,
  address,
  setAddress,
  phone,
  setPhone,
  memo,
  setMemo,
  availableBalance,
  loading,
  error,
  onMethodSelect,
  onContinue,
  onSubmit,
}: any) {
  const progressLabels = ["Withdrawal Method", "Withdrawal Details", "Review & Submit", "Completed"];

  return (
    <div className="max-w-4xl mx-auto">
      <ProgressSteps currentStep={step} labels={progressLabels} />

      <div className="mt-8">
        {step === 1 && (
          <WithdrawStep1
            selectedMethod={selectedMethod}
            onSelectMethod={setSelectedMethod}
            onContinue={onContinue}
            onBack={onBack}
          />
        )}
        {step === 2 && selectedMethod === "mpesa" && (
          <WithdrawMpesaDetails
            amount={amount}
            setAmount={setAmount}
            phone={phone}
            setPhone={setPhone}
            availableBalance={availableBalance}
            onContinue={() => onStepChange(3)}
            onBack={onBack}
          />
        )}
        {step === 2 && selectedMethod === "crypto" && (
          <WithdrawCryptoDetails
            coin={coin}
            setCoin={setCoin}
            network={network}
            setNetwork={setNetwork}
            amount={amount}
            setAmount={setAmount}
            address={address}
            setAddress={setAddress}
            memo={memo}
            setMemo={setMemo}
            availableBalance={availableBalance}
            onContinue={() => onStepChange(3)}
            onBack={onBack}
          />
        )}
        {step === 3 && (
          <WithdrawReview
            method={selectedMethod}
            coin={coin}
            network={network}
            amount={amount}
            address={address}
            phone={phone}
            memo={memo}
            availableBalance={availableBalance}
            loading={loading}
            error={error}
            onSubmit={onSubmit}
            onBack={onBack}
          />
        )}
        {step === 4 && (
          <WithdrawSuccess
            method={selectedMethod}
            coin={coin}
            network={network}
            amount={amount}
            onBackToTrading={() => window.location.href = "/trade"}
          />
        )}
      </div>
    </div>
  );
}

export default PaymentCenter;