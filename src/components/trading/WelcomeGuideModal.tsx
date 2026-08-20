import { Info, Rocket, X } from "lucide-react";

interface WelcomeGuideModalProps {
  onClose: () => void;
  onStartTutorial: () => void;
  onLater: () => void;
}

const WelcomeGuideModal = ({ onClose, onStartTutorial, onLater }: WelcomeGuideModalProps) => {
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-[#0b1020]/78 p-4 backdrop-blur-[3px]">
      <div className="relative w-full max-w-[480px] overflow-hidden rounded-[6px] border border-white/[0.06] bg-[#2a3143] px-8 pb-10 pt-8 text-center shadow-[0_30px_90px_rgba(2,7,19,0.58)] sm:px-10">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-7 top-6 flex h-8 w-8 items-center justify-center rounded-full text-[#9da7ba] transition hover:bg-white/5 hover:text-white"
          aria-label="Close tutorial welcome"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mx-auto mb-7 flex h-[74px] w-[74px] rotate-[-18deg] items-center justify-center rounded-[22px] bg-[#1b8ee8] shadow-[0_16px_35px_rgba(20,116,219,0.26)]">
          <Rocket className="h-12 w-12 rotate-[18deg] text-[#eaf6ff]" strokeWidth={1.8} />
          <span className="absolute -right-1 top-5 h-3 w-3 rounded-full bg-[#9fd6ff]" />
          <span className="absolute bottom-4 left-4 h-3 w-3 rounded-full bg-[#9fd6ff]" />
        </div>

        <h2 className="text-[24px] font-bold leading-tight text-white sm:text-[26px]">Welcome to Quotex</h2>
        <p className="mx-auto mt-6 max-w-[390px] text-[16px] font-semibold leading-[1.25] text-[#d5d9e4]">
          You're now on a demo account with <span className="text-white">$10,000 in virtual funds.</span> Practice
          trading risk-free and get comfortable before using real money.
        </p>

        <div className="mt-6 flex items-center justify-center gap-2 rounded-[2px] bg-[#25415f] px-4 py-3 text-[12px] font-semibold text-[#c5cfdf]">
          <Info className="h-4 w-4 shrink-0 text-[#1f95ff]" />
          <span>80% of users start with the tutorial to trade smarter.</span>
        </div>

        <button
          type="button"
          onClick={onStartTutorial}
          className="mt-6 h-[38px] w-full rounded-[4px] bg-[#11b461] text-[14px] font-bold text-white shadow-[0_10px_24px_rgba(17,180,97,0.28)] transition hover:bg-[#10a85b]"
        >
          Start Tutorial - 2 min
        </button>

        <button
          type="button"
          onClick={onLater}
          className="mt-5 text-[13px] font-medium text-[#1389e7] transition hover:text-[#4bb0ff]"
        >
          Later
        </button>
      </div>
    </div>
  );
};

export default WelcomeGuideModal;
