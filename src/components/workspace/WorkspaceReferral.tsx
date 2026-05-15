import {
  CalendarDays,
  Copy,
  FileText,
  Film,
  ImageIcon,
  Link as LinkIcon,
  QrCode,
  Share2,
  UserRoundPlus,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PromoIllustration = ({ compact = false }: { compact?: boolean }) => (
  <div className={`relative ${compact ? "h-[246px]" : "h-full min-h-[198px]"} overflow-hidden`}>
    <div className="absolute bottom-0 right-2 h-[82%] w-[58%] rounded-t-full bg-[#6aa5ff]/18 blur-[2px]" />
    <div className="absolute bottom-0 right-[168px] h-[170px] w-[74px] rounded-t-[42px] bg-[#8ec0ff] shadow-[0_0_0_3px_#2158ff_inset]" />
    <div className="absolute right-[188px] top-[46px] h-[58px] w-[58px] rounded-full bg-[#9dccff] shadow-[0_0_0_3px_#2158ff_inset]" />
    <div className="absolute right-[196px] top-[67px] h-[3px] w-[8px] rounded-full bg-[#2251c8]" />
    <div className="absolute right-[174px] top-[68px] h-[3px] w-[8px] rounded-full bg-[#2251c8]" />
    <div className="absolute right-[184px] top-[83px] h-[8px] w-[18px] rounded-b-full border-b-2 border-[#2251c8]" />
    <div className="absolute right-[250px] top-[92px] h-[94px] w-[38px] -rotate-12 rounded-[12px] bg-[#7fb5ff] shadow-[0_0_0_3px_#2158ff_inset]" />
    <div className="absolute right-[238px] top-[124px] h-[14px] w-[26px] rounded-full bg-[#14f065]" />

    <div className="absolute bottom-0 right-[30px] h-[190px] w-[98px] rounded-t-[48px] bg-[#609cf3] shadow-[0_0_0_3px_#2158ff_inset]" />
    <div className="absolute right-[72px] top-[36px] h-[64px] w-[64px] rounded-full bg-[#8ec0ff] shadow-[0_0_0_3px_#2158ff_inset]" />
    <div className="absolute right-[93px] top-[59px] h-[3px] w-[8px] rounded-full bg-[#2251c8]" />
    <div className="absolute right-[69px] top-[59px] h-[3px] w-[8px] rounded-full bg-[#2251c8]" />
    <div className="absolute right-[80px] top-[76px] h-[8px] w-[18px] rounded-b-full border-b-2 border-[#2251c8]" />
    <div className="absolute right-[5px] top-[116px] h-[102px] w-[54px] rotate-12 rounded-[14px] bg-[#8dbdff] shadow-[0_0_0_3px_#2158ff_inset]" />
    <div className="absolute right-[24px] top-[138px] h-[48px] w-[4px] rounded bg-[#2158ff]" />
  </div>
);

export const WorkspaceReferral = () => {
  const { user, profile } = useAuth();
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [referredCount, setReferredCount] = useState(0);
  const [depositAmount, setDepositAmount] = useState(10);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareMode, setShareMode] = useState<"link" | "code">("link");

  const referralCode = useMemo(() => {
    const saved = String((profile as any)?.referral_code ?? "").trim().toUpperCase();
    if (saved) return saved;
    return `FRIENDS${String(user?.id ?? "INIT").replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  }, [profile, user?.id]);

  const refLink = useMemo(() => `${window.location.origin}/register?ref=${referralCode}`, [referralCode]);
  const shortLink = useMemo(() => `https://pocket-friends.co/r/${referralCode.toLowerCase().slice(0, 7)}`, [referralCode]);
  const rewardAmount = Math.max(1, Math.round(depositAmount * 0.1));
  const inviteeBonusPercent = depositAmount >= 100 ? 100 : 0;

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

  const copyValue = (value: string, field: string) => {
    void navigator.clipboard.writeText(value).catch(() => undefined);
    setCopiedField(field);
    window.setTimeout(() => setCopiedField(null), 1600);
  };

  const shareTargets = [
    { label: "f", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(refLink)}` },
    { label: "vk", href: "#" },
    { label: "tg", href: `https://t.me/share/url?url=${encodeURIComponent(refLink)}` },
    { label: "X", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(refLink)}` },
    { label: "wa", href: `https://wa.me/?text=${encodeURIComponent(refLink)}` },
    { label: "ig", href: "#" },
  ];

  return (
    <div className="relative h-full w-full overflow-y-auto bg-[#141827] px-5 py-4 text-white">
      <div className="mx-auto flex min-h-full w-full max-w-[1480px] gap-5">
        <aside className="w-[280px] shrink-0">
          <div className="rounded-[6px] bg-[#101423] p-5">
            <div className="flex h-[172px] items-center justify-center">
              <div className="relative h-[132px] w-[132px]">
                <div className="absolute inset-y-0 left-0 w-[74px] rounded-l-[7px] rounded-r-[58px] bg-[#2455e6]" />
                <div className="absolute bottom-0 left-[62px] h-[62px] w-[62px] rounded-full bg-[#22f565]" />
              </div>
            </div>

            <div className="mt-5 space-y-5">
              <div>
                <h3 className="text-[16px] font-bold">Your referral link</h3>
                <div className="mt-2 flex h-[38px] items-center gap-2">
                  <div className="flex h-full min-w-0 flex-1 items-center rounded-[6px] border border-[#2a3652] bg-[#121829] px-3 text-[13px] font-bold text-white">
                    <span className="truncate">{shortLink}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyValue(refLink, "link")}
                    className="flex h-[38px] w-[38px] items-center justify-center rounded-[6px] border border-[#2a3652] bg-[#1a2134] text-[#8da0bf] hover:text-white"
                    aria-label="Copy referral link"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-[16px] font-bold">Your referral promo code</h3>
                <div className="mt-2 flex h-[38px] items-center gap-2">
                  <div className="flex h-full min-w-0 flex-1 items-center rounded-[6px] border border-[#2a3652] bg-[#121829] px-3 text-[13px] font-bold text-white">
                    <span className="truncate">{referralCode}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyValue(referralCode, "code")}
                    className="flex h-[38px] w-[38px] items-center justify-center rounded-[6px] border border-[#2a3652] bg-[#1a2134] text-[#8da0bf] hover:text-white"
                    aria-label="Copy referral code"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="flex h-[38px] w-full items-center justify-center gap-2 rounded-[6px] border border-[#2a3652] bg-[#1b2235] text-[13px] font-bold hover:bg-[#222b43]"
              >
                <Share2 className="h-4 w-4 text-[#9badc8]" />
                Share
              </button>
            </div>

            <div className="mt-6">
              <h3 className="text-[16px] font-bold">Your Pocket Friends</h3>
              <div className="mt-3 space-y-2 text-[13px]">
                <div className="flex items-center justify-between text-[#8fb0df]">
                  <span>Total registered</span>
                  <span className="font-bold text-white">{referredCount || "-"}</span>
                </div>
                <div className="flex items-center justify-between text-[#8fb0df]">
                  <span>First Deposits</span>
                  <span className="font-bold text-white">-</span>
                </div>
                <div className="flex items-center justify-between text-[#8fb0df]">
                  <span>Rewards</span>
                  <span className="font-bold text-white">${Number((profile as any)?.referral_earnings ?? 0).toFixed(0)}</span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1 space-y-4 pb-6">
          <div className="flex flex-wrap gap-3">
            {["Trading profile", "Profile", "Loyalty program", "Security", "Trading history", "Pocket Friends"].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`h-[36px] rounded-[5px] px-5 text-[12px] font-bold uppercase ${
                  tab === "Pocket Friends" ? "bg-[#1d57f0] text-white" : "bg-[#202942] text-[#8ea4c6]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <section className="grid min-h-[310px] grid-cols-[1fr_360px] overflow-hidden rounded-[7px] bg-[#101423]">
            <div className="p-5">
              <h1 className="text-[24px] font-bold">Pocket Friends</h1>
              <p className="mt-4 text-[14px] font-bold">Trade together! Earn together!</p>
              <ol className="mt-4 space-y-3 text-[14px] font-bold leading-5">
                <li>1. <span className="ml-3">Get your referral link.</span></li>
                <li>2. <span className="ml-3">Share the link with a friend.</span></li>
                <li>3. <span className="ml-3">When your invited friend makes a deposit of at least $10 and achieves a trading turnover of 15 times that amount, both of you will receive trading bonuses.</span></li>
              </ol>
              <p className="mt-6 text-[16px] font-bold text-[#8fb4e7]">The more friends you invite, the more bonuses you get!</p>
              <div className="mt-4 flex gap-3">
                <button type="button" className="flex h-[36px] items-center gap-2 rounded-[5px] bg-[#202942] px-5 text-[13px] font-bold">
                  <CalendarDays className="h-4 w-4 text-[#8ea4c6]" />
                  Bonus Calculator
                </button>
                <button type="button" className="flex h-[36px] items-center gap-2 rounded-[5px] bg-[#202942] px-5 text-[13px] font-bold">
                  <FileText className="h-4 w-4 text-[#8ea4c6]" />
                  Terms
                </button>
              </div>
            </div>
            <PromoIllustration />
          </section>

          <section className="rounded-[7px] bg-[#101423] p-5">
            <h2 className="text-[20px] font-bold">Bonus Calculator</h2>
            <p className="mt-4 text-[14px] font-bold text-[#8fb4e7]">Select the expected first deposit from your invitee and calculate your bonus.</p>
            <div className="mt-2 text-[34px] font-bold">${depositAmount}</div>
            <input
              type="range"
              min={10}
              max={1000}
              step={10}
              value={depositAmount}
              onChange={(event) => setDepositAmount(Number(event.target.value))}
              className="mt-8 h-[5px] w-full accent-[#d7dce7]"
            />
            <div className="mt-1 flex justify-between text-[13px] text-[#8fb4e7]">
              <span>$10</span>
              <span>$1,000+</span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-5">
              <div className="rounded-[6px] border border-dashed border-[#2c3651] p-5">
                <h3 className="text-[16px] font-bold">You will receive:</h3>
                <p className="mt-4 text-[12px] text-[#8fb4e7]">Balance Bonus:</p>
                <div className="mt-1 text-[34px] font-bold">${rewardAmount}</div>
              </div>
              <div className="rounded-[6px] border border-dashed border-[#2c3651] p-5">
                <h3 className="text-[16px] font-bold">The invitee will receive:</h3>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[12px] text-[#8fb4e7]">Risk-free:</p>
                    <div className="mt-1 text-[34px] font-bold">${rewardAmount}</div>
                  </div>
                  <div>
                    <p className="text-[12px] text-[#8fb4e7]">Bonus on deposit starting at $100:</p>
                    <div className="mt-1 text-[34px] font-bold">+{inviteeBonusPercent}%</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="flex min-h-[68px] items-center justify-between rounded-[7px] bg-[#1d57f0] px-5">
            <div>
              <h2 className="text-[20px] font-bold">Promo materials for our Friends</h2>
              <p className="mt-2 text-[13px] font-bold">We've prepared promo banners and videos for your convenience. Click the button and choose the materials you need.</p>
            </div>
            <div className="flex gap-3">
              <button type="button" className="flex h-[34px] items-center gap-2 rounded-[7px] bg-white/90 px-5 text-[13px] text-[#24314d]">
                <ImageIcon className="h-4 w-4" />
                Banners
              </button>
              <button type="button" className="flex h-[34px] items-center gap-2 rounded-[7px] bg-white/90 px-5 text-[13px] text-[#24314d]">
                <Film className="h-4 w-4" />
                Videos
              </button>
            </div>
          </section>

          <section className="min-h-[265px] rounded-[7px] bg-[#101423] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-[22px] font-bold">Your Pocket Friends:</h2>
              <div className="flex items-center gap-3">
                <button type="button" className="flex h-[34px] items-center gap-2 rounded-[4px] border border-[#33415e] bg-[#141b2b] px-4 text-[13px] text-[#8fb4e7]">
                  <CalendarDays className="h-4 w-4" />
                  2025-01-29 - 2026-05-15
                </button>
                <button type="button" className="h-[34px] rounded-[4px] bg-[#202942] px-5 text-[13px] font-bold">Apply</button>
              </div>
            </div>
            <div className="flex min-h-[205px] flex-col items-center justify-center text-center">
              <div className="relative mb-8">
                <div className="h-[20px] w-[150px] rounded bg-[#182039]" />
                <div className="mt-2 h-[20px] w-[200px] rounded bg-[#182039]" />
                <div className="mx-auto mt-2 h-[20px] w-[150px] rounded bg-[#182039]" />
                <div className="absolute left-1/2 top-2 flex h-[64px] w-[64px] -translate-x-1/2 items-center justify-center rounded-[9px] bg-[#2c3855]">
                  <UserRoundPlus className="h-8 w-8 text-[#9db7da]" />
                </div>
              </div>
              <h3 className="text-[18px] font-bold">Still don't have Pocket Friends?</h3>
              <p className="mt-4 text-[13px] text-[#8fb4e7]">Share your link on social media and get friends there!</p>
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="mt-6 flex h-[36px] w-[270px] items-center justify-center gap-2 rounded-[6px] bg-[#006747] text-[13px] font-bold"
              >
                <LinkIcon className="h-4 w-4" />
                Share your link
              </button>
            </div>
          </section>
        </main>
      </div>

      {shareOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4 backdrop-blur-[2px]">
          <div className="w-[400px] overflow-hidden rounded-[18px] border border-[#46516c] bg-[#262d43] shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
            <div className="relative h-[256px] bg-[#30384f]">
              <PromoIllustration compact />
              <button
                type="button"
                onClick={() => setShareOpen(false)}
                className="absolute right-5 top-5 text-[#6f7a93] hover:text-white"
                aria-label="Close share modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-8 pb-8">
              <h2 className="text-[28px] font-bold">Share what you've got!</h2>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShareMode("link")}
                  className={`h-[35px] rounded-[5px] border px-4 text-[13px] font-bold ${
                    shareMode === "link" ? "border-[#19a8ff] text-white" : "border-[#39445c] bg-[#20283d] text-[#8da0bf]"
                  }`}
                >
                  Referral link
                </button>
                <button
                  type="button"
                  onClick={() => setShareMode("code")}
                  className={`h-[35px] rounded-[5px] border px-4 text-[13px] font-bold ${
                    shareMode === "code" ? "border-[#19a8ff] text-white" : "border-[#39445c] bg-[#20283d] text-[#8da0bf]"
                  }`}
                >
                  Promo code
                </button>
              </div>

              <div className="mt-3 rounded-[9px] bg-[#1d2435] p-5">
                <div className="flex h-[36px] items-center gap-2">
                  <div className="flex h-full min-w-0 flex-1 items-center rounded-[7px] border border-[#39445c] bg-[#222a3d] px-3 text-[12px] font-bold">
                    <span className="truncate">{shareMode === "link" ? shortLink : referralCode}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyValue(shareMode === "link" ? refLink : referralCode, shareMode)}
                    className="flex h-[36px] w-[36px] items-center justify-center rounded-[7px] border border-[#39445c] bg-[#222a3d] text-[#8da0bf]"
                    aria-label="Copy share value"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="flex h-[36px] w-[36px] items-center justify-center rounded-[7px] border border-[#39445c] bg-[#222a3d] text-[#8da0bf]"
                    aria-label="Show QR code"
                  >
                    <QrCode className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-3 text-[13px] text-[#8fa4c2]">Share to:</p>
                <div className="mt-2 flex gap-3">
                  {shareTargets.map((target) => (
                    <a
                      key={target.label}
                      href={target.href}
                      target={target.href === "#" ? undefined : "_blank"}
                      rel="noreferrer"
                      className="flex h-[36px] w-[36px] items-center justify-center rounded-[9px] bg-[#26314a] text-[13px] font-black text-[#9fb2d1] hover:text-white"
                    >
                      {target.label}
                    </a>
                  ))}
                </div>
              </div>

              {copiedField ? <p className="mt-3 text-[12px] font-bold text-[#5df18b]">Copied {copiedField}.</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
