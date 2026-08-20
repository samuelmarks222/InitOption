import { Check, Rocket, Send, X } from "lucide-react";

interface OnboardingAccountChoiceModalProps {
  demoBalance: number;
  onClose: () => void;
  onUseDemo: () => void;
  onDeposit: () => void;
}

const formatMoney = (value: number) => `${Math.round(value).toLocaleString()} $`;

const OnboardingAccountChoiceModal = ({
  demoBalance,
  onClose,
  onUseDemo,
  onDeposit,
}: OnboardingAccountChoiceModalProps) => {
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-[#101522]/78 p-4 backdrop-blur-[5px]">
      <div className="relative w-full max-w-[548px] rounded-[6px] border border-white/[0.06] bg-[#2a3143] p-7 shadow-[0_30px_90px_rgba(2,7,19,0.58)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 flex h-7 w-7 items-center justify-center rounded-full text-[#8e98ab] transition hover:bg-white/5 hover:text-white"
          aria-label="Close account selection"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-left text-[13px] font-bold text-white">Choose your account</h2>

        <section className="mt-9 grid gap-6 px-6 sm:grid-cols-[1.1fr_0.9fr] sm:items-center">
          <div>
            <div className="flex items-center gap-3 text-[18px] font-bold text-white">
              <Send className="h-7 w-7 text-white" />
              Demo account
            </div>
            <p className="mt-3 max-w-[220px] text-[13px] font-medium leading-[1.25] text-[#a6adbb]">
              Your demo account has a {formatMoney(demoBalance)} balance
            </p>
            <ul className="mt-6 space-y-2 text-left text-[12px] font-semibold leading-tight text-white">
              <li>Practice trading without risk</li>
              <li>Refill balance anytime</li>
              <li>Some assets are unavailable</li>
            </ul>
          </div>

          <div className="text-center">
            <div className="text-[24px] font-bold text-white">Without risk</div>
            <button
              type="button"
              onClick={onUseDemo}
              className="mt-6 rounded-[3px] bg-[#505768] px-4 py-3 text-[13px] font-bold text-white transition hover:bg-[#5b6376]"
            >
              Trading on a demo account
            </button>
          </div>
        </section>

        <section className="mt-9 grid rounded-[6px] border-2 border-[#05c66d] px-6 py-8 shadow-[0_0_0_1px_rgba(5,198,109,0.14)] sm:grid-cols-[1.1fr_0.9fr] sm:items-center">
          <div>
            <div className="flex items-center gap-3 text-[18px] font-bold text-white">
              <Rocket className="h-7 w-7 text-[#f0fbff]" />
              Real account
            </div>
            <p className="mt-3 max-w-[250px] text-[13px] font-semibold leading-[1.25] text-[#a6adbb]">
              Top up your account with the minimum amount and start earning
            </p>
            <ul className="mt-6 space-y-2 text-left text-[12px] font-semibold leading-tight text-white">
              <li>Minimum deposit - $10</li>
              <li>Access more assets and features</li>
              <li>Join tournaments and earn real money</li>
            </ul>
          </div>

          <div className="mt-7 text-center sm:mt-0">
            <div className="text-[28px] font-bold text-[#08c86d]">10 $</div>
            <div className="mt-2 text-[12px] font-semibold text-[#9aa2b3]">Minimum deposit</div>
            <button
              type="button"
              onClick={onDeposit}
              className="mt-6 inline-flex h-[38px] items-center justify-center gap-2 rounded-[4px] bg-[#15b866] px-5 text-[13px] font-bold text-white shadow-[0_10px_24px_rgba(17,180,97,0.28)] transition hover:bg-[#12a85d]"
            >
              <Check className="h-4 w-4" />
              Top up with 100 $
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default OnboardingAccountChoiceModal;
