import { Gift, Percent, Users, Wallet, ArrowRight, X } from "lucide-react";

interface WelcomeGuideModalProps {
  onClose: () => void;
  onDeposit: () => void;
  onReferral: () => void;
  canClaimBonus: boolean;
}

const WelcomeGuideModal = ({ onClose, onDeposit, onReferral, canClaimBonus }: WelcomeGuideModalProps) => {
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-[#03060d]/82 p-2 backdrop-blur-[3px] sm:p-4">
      <div
        className="relative w-full max-w-[360px] overflow-hidden rounded-[20px] border shadow-[0_35px_100px_rgba(8,18,40,0.62)] sm:max-w-[440px] sm:rounded-[26px]"
        style={{
          background: "linear-gradient(180deg, rgba(40,55,90,0.98) 0%, rgba(30,42,72,0.98) 100%)",
          borderColor: "rgba(173, 205, 255, 0.18)",
        }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(106,180,255,0.28),transparent_42%)]" />
        <button
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center rounded-full text-[#a7b8db] transition hover:bg-white/5 hover:text-white sm:right-4 sm:top-4 sm:h-9 sm:w-9"
          aria-label="Close welcome guide"
        >
          <X className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        <div className="relative px-4 pb-5 pt-6 sm:px-6 sm:pb-8 sm:pt-8">
          {/* Hero */}
          {canClaimBonus ? (
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full sm:h-20 sm:w-20"
              style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)" }}
            >
              <Gift className="h-7 w-7 text-white sm:h-10 sm:w-10" />
            </div>
          ) : (
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full sm:h-20 sm:w-20"
              style={{ background: "linear-gradient(135deg, #63b3ed, #3182ce)" }}
            >
              <Percent className="h-7 w-7 text-white sm:h-10 sm:w-10" />
            </div>
          )}

          {canClaimBonus ? (
            <>
              <h2 className="text-center text-[18px] font-bold leading-snug text-white sm:text-[26px]">
                50% Welcome Bonus
              </h2>
              <p className="mx-auto mt-2 max-w-[280px] text-center text-[13px] font-medium leading-6 text-[#dce9ff] sm:mt-3 sm:max-w-[330px] sm:text-[15px] sm:leading-7">
                Make your first deposit and get a <strong className="text-[#fbbf24]">50% bonus</strong> added to your balance instantly.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-center text-[18px] font-bold leading-snug text-white sm:text-[26px]">
                Earn With Referrals
              </h2>
              <p className="mx-auto mt-2 max-w-[280px] text-center text-[13px] font-medium leading-6 text-[#dce9ff] sm:mt-3 sm:max-w-[330px] sm:text-[15px] sm:leading-7">
                Invite friends and earn commissions every time they trade.
              </p>
            </>
          )}

          {/* Steps */}
          <div className="mt-5 space-y-3 sm:mt-6 sm:space-y-3.5">
            {canClaimBonus && (
              <div className="flex items-start gap-3 rounded-xl border p-3 sm:p-4"
                style={{ borderColor: "rgba(251,191,36,0.2)", background: "rgba(251,191,36,0.06)" }}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full sm:h-10 sm:w-10"
                  style={{ background: "rgba(251,191,36,0.18)" }}
                >
                  <Wallet className="h-4 w-4 text-[#fbbf24] sm:h-5 sm:w-5" />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-white sm:text-[14px]">Deposit & get 50% bonus</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed sm:text-[13px]" style={{ color: "#b8c9ed" }}>
                    Any deposit amount qualifies. The 50% bonus is credited immediately to your trading balance.
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 rounded-xl border p-3 sm:p-4"
              style={{ borderColor: "rgba(99,179,237,0.2)", background: "rgba(99,179,237,0.06)" }}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full sm:h-10 sm:w-10"
                style={{ background: "rgba(99,179,237,0.18)" }}
              >
                <Users className="h-4 w-4 text-[#63b3ed] sm:h-5 sm:w-5" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-white sm:text-[14px]">Earn referral commissions</p>
                <p className="mt-0.5 text-[12px] leading-relaxed sm:text-[13px]" style={{ color: "#b8c9ed" }}>
                  Invite friends using your personal referral link. You earn a commission every time they deposit and trade.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-5 space-y-2.5 sm:mt-6 sm:space-y-3">
            {canClaimBonus && (
              <button
                onClick={onDeposit}
                className="flex w-full items-center justify-center gap-2 rounded-[11px] px-4 py-3 text-[14px] font-bold text-white transition hover:brightness-105 sm:rounded-[14px] sm:px-5 sm:py-3.5 sm:text-[16px]"
                style={{
                  background: "linear-gradient(180deg, #f59e0b 0%, #d97706 100%)",
                  boxShadow: "0 14px 30px rgba(217,119,6,0.32)",
                }}
              >
                <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
                Deposit Now — Get 50% Bonus
              </button>
            )}

            <button
              onClick={onReferral}
              className="flex w-full items-center justify-center gap-2 rounded-[11px] border px-4 py-2.5 text-[13px] font-semibold transition hover:bg-white/10 sm:rounded-[14px] sm:px-5 sm:py-3 sm:text-[15px]"
              style={{
                borderColor: "rgba(155, 183, 236, 0.18)",
                background: "rgba(79, 94, 136, 0.72)",
                color: "#eef4ff",
              }}
            >
              <Users className="h-4 w-4 sm:h-5 sm:w-5" />
              See Referral Program
              <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          </div>

          <button
            onClick={onClose}
            className="mt-4 w-full text-center text-[12px] font-medium text-[#55b7ff] transition hover:text-[#86cbff] sm:mt-5 sm:text-[14px]"
          >
            I'll do this later
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeGuideModal;
