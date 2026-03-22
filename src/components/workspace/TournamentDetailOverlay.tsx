import { useState, useEffect } from "react";
import { ChevronLeft, ChevronDown, Trophy, ShieldAlert, Zap, Users, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";

type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];
type Participant = Database["public"]["Tables"]["tournament_participants"]["Row"] & { profiles?: { username: string | null } };

interface TournamentDetailOverlayProps {
  tournamentId: string | null;
  onClose: () => void;
  onOpenDeposit?: () => void;
  onEnterTournament?: (id: string) => void;
}

export const TournamentDetailOverlay = ({ tournamentId, onClose, onOpenDeposit, onEnterTournament }: TournamentDetailOverlayProps) => {
  const [t, setT] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const { profile, updateProfile } = useAuth();

  useEffect(() => {
    if (!tournamentId) return;

    const fetchDetails = async () => {
      setLoading(true);
      // Fetch tournament logic
      const { data: tData } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single();
      if (tData) setT(tData);

      // Fetch participants logic
      const { data: pData } = await supabase
        .from('tournament_participants')
        .select(`*, profiles(username)`)
        .eq('tournament_id', tournamentId)
        .order('current_balance', { ascending: false });
        
      if (pData) setParticipants(pData as any);
      setLoading(false);
    };

    fetchDetails();
  }, [tournamentId]);

  if (!tournamentId) return null;

  const userBalance = profile?.balance ?? 0;
  const hasJoined = profile ? participants.some(p => p.user_id === profile.id) : false;

  const handleJoin = async () => {
    if (!t || !profile) {
      toast.error("You must be logged in to participate.");
      return;
    }

    if (hasJoined) {
      onEnterTournament?.(t.id);
      return;
    }

    if (userBalance < t.entry_fee) {
      toast.error(`Insufficient balance. You need $${t.entry_fee} to join.`);
      onOpenDeposit?.();
      return;
    }

    setJoining(true);
    
    // 1. Deduct balance from profile
    try {
      if (t.entry_fee > 0) {
        await updateProfile({
          balance: userBalance - t.entry_fee,
        });
      }

      // 2. Insert participant
      const { error: pError } = await supabase.from('tournament_participants').insert({
        tournament_id: t.id,
        user_id: profile.id,
        current_balance: t.starting_balance
      });

      if (pError) throw pError;

      toast.success(`Successfully entered ${t.title}! Transferring to Arena.`);
      
      // Update local state to reflect new addition instantly
      setParticipants([{
        id: "temp",
        tournament_id: t.id,
        user_id: profile.id,
        current_balance: t.starting_balance,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        profiles: { username: profile.username || "You" }
      }, ...participants]);

      setTimeout(() => onEnterTournament?.(t.id), 1200);

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to join tournament. Server Error.");
    } finally {
      setJoining(false);
    }
  };

  const FAQS = [
    {
      q: "What is a competitive arena?",
      a: "An arena is an isolated trading competition where participants receive identical sandbox balances to trade over a set period. The goal is to maximize the balance before the countdown terminates. Elite traders at the apex of the leaderboard extract the shared prize pool."
    },
    {
      q: "How is the prize distributed?",
      a: "At the exact termination timestamp, arena modules lock instantly. The final portfolio valuations of all active participants are mathematically cross-verified. The top tier of the leaderboard triggers an automated payout contract drawing from the decentralized prize pool."
    },
    {
      q: "Can I join for free?",
      a: "If the entry fee metric displays 'FREE', no capital deduction will occur. Some circuits rely heavily on sponsorship injections to supply the reward pools."
    }
  ];

  const formatDate = (isoString: string) => {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(isoString));
  };


  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-md">
      <div className="w-[85%] h-full bg-[#0a0d14] flex flex-col transform transition-transform duration-500 shadow-[-20px_0_50px_rgba(0,0,0,0.8)] border-l border-indigo-500/20">
        
        {/* Header Bar */}
        <div className="flex items-center gap-4 p-6 border-b border-indigo-500/10 bg-gradient-to-r from-[#0d121c] to-[#0a0d14]">
          <button 
            onClick={onClose}
            className="flex items-center gap-2 text-indigo-400 hover:text-white font-black text-[14px] uppercase tracking-widest transition-colors bg-indigo-500/10 hover:bg-indigo-500/20 px-4 py-2 rounded-lg border border-indigo-500/20"
          >
            <ChevronLeft className="w-5 h-5" /> ABORT
          </button>
          <h2 className="text-[20px] font-black text-white uppercase tracking-widest ml-4 flex items-center gap-3">
             <Trophy className="text-indigo-500" />
             Arena Protocol
          </h2>
        </div>

        {/* 2-Column Scrollable Body */}
        {loading || !t ? (
           <div className="flex flex-col items-center justify-center flex-1 text-indigo-400/50">
               <div className="w-12 h-12 border-4 border-t-indigo-500 border-r-indigo-500 border-b-transparent border-l-transparent rounded-full animate-spin mb-4 shadow-[0_0_20px_rgba(99,102,241,0.5)]" />
               <p className="font-bold tracking-widest text-sm animate-pulse">DECRYPTING ARENA NODE...</p>
           </div>
        ) : (
          <div className="flex-1 overflow-y-auto w-full p-10 flex flex-col lg:flex-row gap-12 CustomScrollbar">
            
            {/* ================= LEFT COLUMN ================= */}
            <div className="flex-1 flex flex-col space-y-10">
              
              {/* Massive Hero Banner */}
              <div className="w-full shrink-0 bg-[#0d121c] rounded-3xl p-10 relative overflow-hidden border border-indigo-500/20 flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                {/* Background gradient graphic */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none" />
                
                <div className="relative z-10 flex justify-between items-start mb-10">
                  <div className={`px-3 py-1.5 rounded-[4px] text-[12px] font-black tracking-widest uppercase flex items-center gap-2 shadow-[0_0_15px_rgba(0,0,0,0.5)] border ${
                    t.status === 'active' ? "bg-green-500/10 text-green-400 border-green-500/30 shadow-[0_0_10px_rgba(7ade80,0.2)]" : 
                    t.status === 'upcoming' ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" : 
                    "bg-gray-800 text-gray-400 border-gray-700"
                  }`}>
                    {t.status === 'active' ? <Zap className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    STATUS: {t.status}
                  </div>
                  <div className="text-right bg-black/40 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
                    <div className="text-[12px] text-gray-400 font-black uppercase tracking-widest mb-1">Prize Pool Network</div>
                    <div className="text-[36px] font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-200 leading-none drop-shadow-[0_0_10px_rgba(250,204,21,0.3)]">${t.prize_pool.toLocaleString()}</div>
                  </div>
                </div>

                <div className="relative z-10 flex justify-between items-end mt-12">
                  <h1 className="text-[48px] font-black text-white leading-tight w-[60%] drop-shadow-md">{t.title}</h1>
                  <button 
                    onClick={handleJoin}
                    disabled={hasJoined || joining || t.status === 'completed' || t.status === 'cancelled'}
                    className={`
                      ${hasJoined ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' : 
                        t.status === 'completed' || t.status === 'cancelled' ? 'bg-gray-800 text-gray-500 border-gray-700 pointer-events-none' :
                        'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.5)] hover:shadow-[0_0_30px_rgba(99,102,241,0.8)]'} 
                      font-black text-[18px] uppercase tracking-widest px-10 py-5 rounded-xl transition-all border
                    `}
                  >
                    {joining ? "PROCESSING..." : hasJoined ? "ALREADY JOINED" : t.status === 'completed' ? "TOURNAMENT ENDED" : `JOIN TOURNAMENT — $${t.entry_fee}`}
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="w-full grid grid-cols-4 gap-6 bg-[#0d121c]/50 p-8 rounded-2xl border border-white/5">
                {[
                  { label: "START TIME", val: formatDate(t.start_date) },
                  { label: "END TIME", val: formatDate(t.end_date) },
                  { label: "SANDBOX BALANCE", val: `$${t.starting_balance}` },
                  { label: "FEE REQUIREMENT", val: t.entry_fee === 0 ? "FREE" : `$${t.entry_fee}` },
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col items-start justify-center text-left border-l-2 border-indigo-500/30 pl-4">
                    <div className="text-[10px] text-indigo-400/70 font-black tracking-widest uppercase mb-1">{stat.label}</div>
                    <div className="text-[16px] font-mono font-bold text-white">{stat.val}</div>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div className="w-full pt-6 relative">
                <div className="flex items-center mb-4 gap-3">
                  <ShieldAlert className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-[20px] font-black text-white uppercase tracking-widest">RULES OF ENGAGEMENT</h3>
                </div>
                <p className="text-[15px] text-gray-400 leading-relaxed font-mono bg-[#0d121c] p-6 rounded-xl border border-white/5">
                  {t.description || "To participate, confirm the resource expenditure algorithm. The system allocates isolated sandbox capital instantaneously. Outperform parallel nodes to extract grid rewards. Exploitation triggers permanent hardware bans."}
                </p>
              </div>
            </div>

            {/* ================= RIGHT COLUMN ================= */}
            <div className="w-[45%] flex flex-col space-y-10 pl-10 border-l border-indigo-500/10">
              
              {/* Participants Table */}
              <div className="bg-[#0d121c] rounded-2xl border border-white/5 overflow-hidden flex flex-col h-[50vh]">
                <div className="px-6 py-5 border-b border-white/5 bg-black/40 flex items-center justify-between">
                   <h3 className="font-black text-white uppercase tracking-widest flex items-center gap-2">
                     <Users className="w-4 h-4 text-indigo-400" />
                     ACTIVE NODES
                   </h3>
                   <span className="text-gray-500 font-mono text-sm">{participants.length} CONNECTED</span>
                </div>
                <div className="flex-1 overflow-y-auto CustomScrollbar">
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[#0d121c] z-10 shadow-sm">
                      <tr className="border-b border-white/5 text-[11px] text-gray-500 font-black tracking-widest uppercase">
                        <td className="w-16 px-6 py-4">RANK</td>
                        <td className="py-4">ALIAS</td>
                        <td className="text-right px-6 py-4">PORTFOLIO VAL</td>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {participants.length > 0 ? participants.map((p, i) => (
                        <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                          <td className="px-6 py-4 text-[13px] font-mono font-bold text-gray-500">#{i + 1}</td>
                          <td className="py-4 flex items-center gap-3">
                            <span className="text-[14px] font-bold text-white group-hover:text-indigo-400 transition-colors">
                              {p.user_id === profile?.id ? <span className="text-indigo-400">[YOU] {p.profiles?.username}</span> : p.profiles?.username || "Anonymous"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-[14px] font-mono font-bold text-green-400">${p.current_balance}</td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={3} className="py-16 text-center text-[13px] font-bold text-gray-500 uppercase tracking-widest">
                             Grid is empty. Awaiting connections.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* FAQ Accordion */}
              <div>
                <h3 className="text-[18px] font-black text-white uppercase tracking-widest mb-6">ARENA INTEL</h3>
                <div className="space-y-3">
                  {FAQS.map((faq, i) => (
                    <div key={i} className="bg-[#0d121c] border border-white/5 rounded-xl overflow-hidden transition-all">
                      <button 
                        onClick={() => setOpenFaq(openFaq === i ? null : i)}
                        className="w-full flex justify-between items-center px-6 py-5 text-left group"
                      >
                        <span className={`text-[13px] font-black tracking-widest uppercase transition-colors ${openFaq === i ? "text-indigo-400" : "text-gray-400 group-hover:text-white"}`}>{faq.q}</span>
                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${openFaq === i ? "rotate-180 text-indigo-400" : "group-hover:text-white"}`} />
                      </button>
                      {openFaq === i && (
                        <div className="px-6 pb-6 text-[13px] text-gray-400 leading-relaxed font-mono">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
};
