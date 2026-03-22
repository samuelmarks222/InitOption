import { useState } from "react";
import { ArrowRight, CreditCard, ShieldCheck, Wallet } from "lucide-react";
import { DepositModal } from "@/components/trading/AccountModals";
import { useAuth } from "@/contexts/AuthContext";
import { useCurrency } from "@/contexts/CurrencyContext";

export const ProfileDeposit = () => {
  const { profile } = useAuth();
  const { formatMoney } = useCurrency();
  const [showDepositModal, setShowDepositModal] = useState(false);

  return (
    <div className="max-w-3xl text-white">
      {showDepositModal && <DepositModal onClose={() => setShowDepositModal(false)} />}

      <h2 className="mb-6 text-[24px] font-bold">Deposit Funds</h2>

      <div className="overflow-hidden rounded-[24px] border border-[#0b2f3a] bg-[#13232d] shadow-[0_18px_50px_rgba(0,0,0,0.28)]">
        <div className="border-b border-[#0b2f3a] bg-[#10202a] p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-[13px] font-semibold uppercase tracking-[0.2em] text-[#86c9d4]">Live Account</div>
              <div className="mt-3 text-[32px] font-bold text-white">{formatMoney(profile?.balance ?? 0)}</div>
              <p className="mt-2 max-w-[520px] text-[14px] leading-6 text-[#99b7bd]">
                Your live balance stays at zero until a real deposit request is approved. No mock funds are added automatically.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDepositModal(true)}
              className="inline-flex h-[52px] items-center justify-center gap-2 rounded-[12px] bg-[#1175d5] px-6 text-[15px] font-bold text-white transition-colors hover:bg-[#0d69c2]"
            >
              Open Deposit Window
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-4 p-6 md:grid-cols-3">
          <InfoCard
            icon={Wallet}
            title="Real balance only"
            text="Funds appear only after a finance admin approves the pending deposit request."
          />
          <InfoCard
            icon={CreditCard}
            title="Use supported methods"
            text="Choose any enabled payment method from the deposit window and follow the payment instructions exactly."
          />
          <InfoCard
            icon={ShieldCheck}
            title="Safer account flow"
            text="Automatic blockchain detection is not wired yet, so every deposit stays pending until manual approval."
          />
        </div>
      </div>
    </div>
  );
};

const InfoCard = ({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof Wallet;
  title: string;
  text: string;
}) => (
  <div className="rounded-[18px] border border-[#0b2f3a] bg-[#0f1c24] p-5">
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0b2f3a] text-[#86c9d4]">
      <Icon className="h-5 w-5" />
    </div>
    <div className="mt-4 text-[15px] font-bold text-white">{title}</div>
    <p className="mt-2 text-[13px] leading-6 text-[#88a3ac]">{text}</p>
  </div>
);
