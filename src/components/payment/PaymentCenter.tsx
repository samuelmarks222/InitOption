import { useState } from "react";
import { ArrowLeft, CreditCard, Wallet, History, ArrowRight, ChevronDown } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SiteLogo } from "@/components/branding/SiteLogo";
import { Button } from "@/components/ui/button";
import { DepositStep1 } from "./deposit/DepositStep1";
import { DepositStep2 } from "./deposit/DepositStep2";
import { DepositStep3 } from "./deposit/DepositStep3";
import { DepositSuccess } from "./deposit/DepositSuccess";
import { WithdrawStep1 } from "./withdraw/WithdrawStep1";
import { WithdrawStep2 } from "./withdraw/WithdrawStep2";
import { WithdrawStep3 } from "./withdraw/WithdrawStep3";
import { WithdrawSuccess } from "./withdraw/WithdrawSuccess";
import { TransactionHistory } from "./TransactionHistory";
import { ProgressSteps } from "./ProgressSteps";

type PaymentTab = "deposit" | "withdraw" | "history";
type DepositStep = 1 | 2 | 3 | 4;
type WithdrawStep = 1 | 2 | 3 | 4;

const STEP_LABELS_DEPOSIT = ["Payment Method", "Payment Details", "Payment Process", "Completed"];
const STEP_LABELS_WITHDRAW = ["Withdrawal Method", "Withdrawal Details", "Review & Submit", "Completed"];

export const PaymentCenter = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<PaymentTab>("deposit");
  const [depositStep, setDepositStep] = useState<DepositStep>(1);
  const [withdrawStep, setWithdrawStep] = useState<WithdrawStep>(1);

  const [selectedDepositMethod, setSelectedDepositMethod] = useState<"mpesa" | "crypto" | null>(null);
  const [selectedDepositCoin, setSelectedDepositCoin] = useState<string>("USDT");
  const [selectedDepositNetwork, setSelectedDepositNetwork] = useState<string>("TRC20");
  const [depositAmount, setDepositAmount] = useState<string>("");
  const [depositPhone, setDepositPhone] = useState("");
  const [depositBonusTier, setDepositBonusTier] = useState<number>(3);

  const [selectedWithdrawMethod, setSelectedWithdrawMethod] = useState<"mpesa" | "crypto">("mpesa");
  const [withdrawCoin, setWithdrawCoin] = useState<string>("USDT");
  const [withdrawNetwork, setWithdrawNetwork] = useState<string>("TRC20");
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawMemo, setWithdrawMemo] = useState("");

  const availableBalance = 1250.00; // Mock for UI

  const handleBack = () => {
    if (activeTab === "deposit" && depositStep > 1) {
      setDepositStep((prev) => (prev - 1) as DepositStep);
    } else if (activeTab === "withdraw" && withdrawStep > 1) {
      setWithdrawStep((prev) => (prev - 1) as WithdrawStep);
    }
  };

  const goToDepositStep = (step: DepositStep) => setDepositStep(step);
  const goToWithdrawStep = (step: WithdrawStep) => setWithdrawStep(step);

  const tabConfig = [
    { id: "deposit", label: "DEPOSIT", icon: Wallet },
    { id: "withdraw", label: "WITHDRAWAL", icon: CreditCard },
    { id: "history", label: "HISTORY", icon: History },
  ] as const;

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
            <span className="font-bold text-lg text-white">${(availableBalance).toFixed(2)}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8">
        <nav className="mb-8" aria-label="Payment tabs">
          <div className="flex gap-2 bg-[#141a2a] rounded-xl p-1">
            {tabConfig.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as PaymentTab);
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
            onStepChange={goToDepositStep}
            onBack={handleBack}
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
          )}
        }

        {activeTab === "withdraw" && (
          <WithdrawFlow
            step={withdrawStep}
            onStepChange={goToWithdrawStep}
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
            availableBalance={availableBalance}
          )}
        )

        {activeTab === "history" && <TransactionHistory />}
      </div>
    </div>
  );
};

interface DepositFlowProps {
  step: 1 | 2 | 3 | 4;
  onStepChange: (step: 1 | 2 | 3 | 4) => void;
  onBack: () => void;
  selectedMethod: "mpesa" | "crypto" | null;
  setSelectedMethod: (method: "mpesa" | "crypto") => void;
  selectedCoin: string;
  setSelectedCoin: (coin: string) => void;
  selectedNetwork: string;
  setSelectedNetwork: (network: string) => void;
  amount: string;
  setAmount: (amount: string) => void;
  phone: string;
  setPhone: (phone: string) => void;
  bonusTier: number;
  setBonusTier: (tier: number) => void;
}

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
}: DepositFlowProps) {
  const progressLabels = ["Payment Method", "Payment Details", "Payment Process", "Completed"];

  return (
    <div className="max-w-4xl mx-auto">
      <ProgressSteps currentStep={step} labels={progressLabels} />

      <div className="mt-8">
        {step === 1 && (
          <DepositStep1
            selectedMethod={selectedMethod}
            onSelectMethod={setSelectedMethod}
            onContinue={() => {
              if (selectedMethod) onStepChange(2);
            }}
            onBack={onBack}
          )}
        }
        {step === 2 && selectedMethod === "mpesa" && (
          <DepositMpesaDetails
            amount={amount}
            setAmount={setAmount}
            phone={phone}
            setPhone={setPhone}
            bonusTier={bonusTier}
            setBonusTier={setBonusTier}
            onContinue={() => onStepChange(3)}
            onBack={onBack}
          )}
        }
        {step === 2 && selectedMethod === "crypto" && (
          <DepositCryptoDetails
            selectedCoin={selectedCoin}
            setSelectedCoin={setSelectedCoin}
            selectedNetwork={selectedNetwork}
            setSelectedNetwork={setSelectedNetwork}
            amount={amount}
            setAmount={setAmount}
            onContinue={() => onStepChange(3)}
            onBack={onBack}
          )}
        }
        {step === 3 && selectedMethod === "mpesa" && (
          <DepositMpesaProcess
            onBack={onBack}
            onComplete={() => onStepChange(4)}
          )}
        }
        {step === 3 && selectedMethod === "crypto" && (
          <DepositCryptoProcess
            coin={selectedCoin}
            network={selectedNetwork}
            amount={amount}
            onBack={onBack}
            onComplete={() => onStepChange(4)}
          )}
        }
        {step === 4 && (
          <DepositSuccess
            method={selectedMethod}
            coin={selectedCoin}
            network={selectedNetwork}
            amount={amount}
            onBackToTrading={() => window.location.href = "/trade"}
          )}
        }
      </div>
    </div>
  );
}

interface WithdrawFlowProps {
  step: 1 | 2 | 3 | 4;
  onStepChange: (step: 1 | 2 | 3 | 4) => void;
  onBack: () => void;
  selectedMethod: "mpesa" | "crypto";
  setSelectedMethod: (method: "mpesa" | "crypto") => void;
  coin: string;
  setCoin: (coin: string) => void;
  network: string;
  setNetwork: (network: string) => void;
  amount: string;
  setAmount: (amount: string) => void;
  address: string;
  setAddress: (address: string) => void;
  phone: string;
  setPhone: (phone: string) => void;
  memo: string;
  setMemo: (memo: string) => void;
  availableBalance: number;
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
}: WithdrawFlowProps) {
  const progressLabels = ["Withdrawal Method", "Withdrawal Details", "Review & Submit", "Completed"];

  return (
    <div className="max-w-4xl mx-auto">
      <ProgressSteps currentStep={step} labels={progressLabels} />

      <div className="mt-8">
        {step === 1 && (
          <WithdrawStep1
            selectedMethod={selectedMethod}
            onSelectMethod={setSelectedMethod}
            onContinue={() => onStepChange(2)}
            onBack={onBack}
          )}
        }
        {step === 2 && selectedMethod === "mpesa" && (
          <WithdrawMpesaDetails
            amount={amount}
            setAmount={setAmount}
            phone={phone}
            setPhone={setPhone}
            availableBalance={availableBalance}
            onContinue={() => onStepChange(3)}
            onBack={onBack}
          )}
        }
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
          )}
        }
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
            onSubmit={() => onStepChange(4)}
            onBack={onBack}
          )}
        }
        {step === 4 && (
          <WithdrawSuccess
            method={selectedMethod}
            coin={coin}
            network={network}
            amount={amount}
            onBackToTrading={() => window.location.href = "/trade"}
          )}
        )}
      </div>
    </div>
  );
}

export default PaymentCenter;