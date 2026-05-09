import { CheckCircle2, Copy, Gift, Share2, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const WorkspaceReferral = () => {
  const { user, profile } = useAuth();
  const [copied, setCopied] = useState(false);
  const [referredCount, setReferredCount] = useState(0);

  const refLink = useMemo(() => {
    const code = (profile as any)?.referral_code;
    if (!code) return `${window.location.origin}/register`;
    return `${window.location.origin}/register?ref=${code}`;
  }, [profile]);

  useEffect(() => {
    if (!user) return;

    const fetchReferralCount = async () => {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("referred_by", user.id);

      setReferredCount(count ?? 0);
    };

    void fetchReferralCount();
  }, [user]);

  const handleCopy = () => {
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({
        title: "Join my trading network",
        text: "Use my referral link to sign up and start trading.",
        url: refLink,
      }).catch(() => undefined);
      return;
    }

    handleCopy();
  };

  return (
    <div className="w-full h-full p-4 sm:p-6 text-white overflow-y-auto no-scrollbar space-y-8">
      <div className="bg-gradient-to-br from-[#0fa053]/20 to-[#1e2330]/10 border border-[#0fa053]/30 rounded-2xl p-6 text-center">
        <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Gift className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-[20px] font-bold mb-2">Invite Friends, Get Paid</h2>
        <p className="text-[13px] text-gray-400 leading-relaxed mb-6">
          Earn referral commissions whenever the friends you invite deposit or trade, based on the admin-configured program.
        </p>

        <div className="bg-black/40 rounded-xl p-2 pl-4 flex items-center justify-between gap-2 border border-white/10">
          <span className="text-[12px] sm:text-[14px] font-mono text-gray-300 break-all min-w-0">{refLink}</span>
          <button
            onClick={handleCopy}
            className="w-10 h-10 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors shrink-0"
          >
            {copied ? <CheckCircle2 className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>

        <button className="w-full mt-3 py-3 rounded-xl bg-white text-black font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors" onClick={() => void handleShare()}>
          <Share2 className="w-4 h-4" /> Share Link
        </button>
      </div>

      <div>
        <h3 className="text-[13px] font-bold text-gray-400 uppercase tracking-wider mb-4">Your Network</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#1A1F26] border border-white/5 rounded-2xl p-4">
            <Users className="w-5 h-5 text-[#0fa053] mb-2" />
            <div className="text-[24px] font-bold text-white mb-1">{referredCount}</div>
            <div className="text-[11px] text-gray-500 uppercase font-bold tracking-wider">Referred Users</div>
          </div>
          <div className="bg-[#1A1F26] border border-white/5 rounded-2xl p-4">
            <Gift className="w-5 h-5 text-green-400 mb-2" />
            <div className="text-[24px] font-bold text-[#00C076] mb-1">${Number((profile as any)?.referral_earnings ?? 0).toFixed(2)}</div>
            <div className="text-[11px] text-gray-500 uppercase font-bold tracking-wider">Earned Total</div>
          </div>
        </div>
      </div>
    </div>
  );
};


