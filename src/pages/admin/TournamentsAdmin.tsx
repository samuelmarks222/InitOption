import { useState, useEffect } from "react";
import { Search, Plus, Trash2, Edit, Save, Trophy, X } from "lucide-react";
import { api } from "@/integrations/api/client";
import { toast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];

const createDefaultTournamentDraft = (): Partial<Tournament> => ({
  title: "",
  description: "",
  entry_fee: 10,
  rebuy_cost: 5,
  prize_pool: 500,
  starting_balance: 10000,
  number_of_winners: 10,
  prize_distribution: JSON.stringify([
    { rank: 1, share: 0.3 },
    { rank: 2, share: 0.2 },
    { rank: 3, share: 0.15 },
    { rank: 4, share: 0.1 },
    { rank: 5, share: 0.07 },
    { rank: 6, share: 0.05 },
    { rank: 7, share: 0.04 },
    { rank: 8, share: 0.04 },
    { rank: 9, share: 0.04 },
    { rank: 10, share: 0.05 },
  ]),
  start_date: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
  end_date: new Date(Date.now() + 172800000).toISOString().slice(0, 16),
  status: "draft",
});

const parseDistribution = (raw: string | undefined): Array<{ label: string; position: number; share: number }> => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item: any, idx: number) => ({
      label: item.label || item.rank ? `#${item.rank || idx + 1}` : `Top ${idx + 1}`,
      position: item.rank || idx + 1,
      share: Number(item.share) || 0,
    }));
  } catch {
    return [];
  }
};

const rebuildDistribution = (winnersCount: number, existingRaw?: string) => {
  const current = parseDistribution(existingRaw);
  const equalShare = Number((1 / winnersCount).toFixed(4));
  const next = Array.from({ length: winnersCount }, (_, i) => {
    const rank = i + 1;
    const found = current.find((c) => c.position === rank);
    return { rank, share: found ? found.share : equalShare };
  });
  return JSON.stringify(next);
};

const TournamentsAdmin = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingRebuyId, setEditingRebuyId] = useState<string | null>(null);
  const [rebuyDrafts, setRebuyDrafts] = useState<Record<string, number>>({});
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editDrafts, setEditDrafts] = useState<Record<string, Partial<Tournament>>>({});
  
  const [newTour, setNewTour] = useState(createDefaultTournamentDraft);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    setLoading(true);
    const { data, error } = await api.from('tournaments').select('*').order('created_at', { ascending: false });
    if (error) console.error("Error fetching tournaments:", error);
    else setTournaments(data || []);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tournament? This will also wipe its participant data.")) return;
    const { error } = await api.from('tournaments').delete().eq('id', id);
    if (error) toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Tournament deleted!" });
      setTournaments(tournaments.filter(t => t.id !== id));
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const { data, error } = await api.rpc("admin_update_tournament_status", {
      p_tournament_id: id,
      p_status: newStatus as Tournament["status"],
    });

    if (error) {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
      return;
    }

    const payload = (data ?? {}) as { awarded_prizes?: number; notified_participants?: number };
    const awardedCount = Number(payload.awarded_prizes ?? 0);

    toast({
      title: `Tournament status changed to ${newStatus}`,
      description:
        newStatus === "completed" && awardedCount > 0
          ? `${awardedCount} tournament prize notification${awardedCount === 1 ? "" : "s"} were created automatically.`
          : "Participant notifications were queued automatically where applicable.",
    });
    setTournaments(tournaments.map(t => t.id === id ? { ...t, status: newStatus as any } : t));
  };

  const handleSaveEdit = async (id: string) => {
    const draft = editDrafts[id];
    if (!draft) return;
    const original = tournaments.find((t) => t.id === id);
    if (!original) return;

    const resolvedTitle = draft.title ?? original.title;
    if (!resolvedTitle?.trim()) {
      toast({ title: "Validation Error", description: "Tournament title is required.", variant: "destructive" });
      return;
    }
    const resolvedRebuy = draft.rebuy_cost ?? original.rebuy_cost;
    if (Number(resolvedRebuy) < 0) {
      toast({ title: "Validation Error", description: "Rebuy cost cannot be negative.", variant: "destructive" });
      return;
    }

    const sDate = draft.start_date ? new Date(draft.start_date).toISOString() : undefined;
    const eDate = draft.end_date ? new Date(draft.end_date).toISOString() : undefined;

    let resolvedPrizeDist = draft.prize_distribution;
    if (typeof resolvedPrizeDist === "string") {
      try { resolvedPrizeDist = JSON.parse(resolvedPrizeDist); }
      catch { resolvedPrizeDist = undefined; }
    }
    const { error } = await api.from('tournaments').update({
      ...(draft.title !== undefined && { title: draft.title }),
      ...(draft.description !== undefined && { description: draft.description }),
      ...(draft.entry_fee !== undefined && { entry_fee: Number(draft.entry_fee) }),
      ...(draft.rebuy_cost !== undefined && { rebuy_cost: Number(draft.rebuy_cost) }),
      ...(draft.prize_pool !== undefined && { prize_pool: Number(draft.prize_pool) }),
      ...(draft.starting_balance !== undefined && { starting_balance: Number(draft.starting_balance) }),
      ...(draft.number_of_winners !== undefined && { number_of_winners: Number(draft.number_of_winners) }),
      ...(resolvedPrizeDist !== undefined && { prize_distribution: resolvedPrizeDist }),
      ...(sDate !== undefined && { start_date: sDate }),
      ...(eDate !== undefined && { end_date: eDate }),
    }).eq('id', id);

    if (error) {
      toast({ title: "Failed to update tournament", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Tournament updated successfully!" });
    setTournaments((current) =>
      current.map((t) => (t.id === id ? { ...t, ...draft, start_date: sDate ?? t.start_date, end_date: eDate ?? t.end_date } : t))
    );
    setEditingRowId(null);
    setEditDrafts((current) => { const next = { ...current }; delete next[id]; return next; });
  };

  const handleCreateTour = async () => {
    if (!newTour.title) {
      toast({ title: "Validation Error", description: "Tournament title is required.", variant: "destructive" });
      return;
    }

    const sDate = new Date(newTour.start_date!).toISOString();
    const eDate = new Date(newTour.end_date!).toISOString();

    let prizeDistribution: any = undefined;
    try { prizeDistribution = JSON.parse(newTour.prize_distribution!); } catch {}

    const { data, error } = await api.from('tournaments').insert({
      title: newTour.title,
      description: newTour.description,
      entry_fee: Number(newTour.entry_fee),
      rebuy_cost: Number(newTour.rebuy_cost),
      prize_pool: Number(newTour.prize_pool),
      starting_balance: Number(newTour.starting_balance),
      number_of_winners: Number(newTour.number_of_winners),
      prize_distribution: prizeDistribution,
      start_date: sDate,
      end_date: eDate,
      status: newTour.status
    }).select().single();

    if (error) {
      toast({ title: "Error creating tournament", description: error.message, variant: "destructive" });
    } else if (data) {
      toast({ title: "Tournament created successfully!" });
      setTournaments([data, ...tournaments]);
      setNewTour(createDefaultTournamentDraft());
      setIsCreating(false);
    }
  };

  const filtered = tournaments.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));

  const BORDER = "#202B3A";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b pb-4" style={{ borderColor: BORDER }}>
        <div>
          <h2 className="text-xl font-black text-white flex items-center gap-2">
            <Trophy className="text-[#F59E0B]" size={20} /> LIVE TOURNAMENTS ENGINE
          </h2>
          <p className="text-xs text-[#8D9AAF]">Competition schedules, sandbox balances, prize pools, and automated payout rules.</p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-1.5 rounded-lg border border-[#00C98D]/30 bg-[#00C98D]/10 px-3 py-1.5 text-xs font-bold text-[#00C98D] hover:bg-[#00C98D] hover:text-black transition-colors"
        >
          <Plus size={13} /> {isCreating ? "Cancel" : "New Tournament"}
        </button>
      </div>

      {/* Create Form */}
      {isCreating && (
        <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
          <div className="border-b bg-[#121B29] px-4 py-2.5" style={{ borderColor: BORDER }}>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">New Tournament Configuration</p>
          </div>
          <div className="grid grid-cols-1 gap-3.5 p-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7">
            <div className="col-span-2">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Title</label>
              <input type="text" value={newTour.title} onChange={e => setNewTour({...newTour, title: e.target.value})} placeholder="Weekend Alpha Cup" className="w-full h-8 rounded-lg border bg-[#080D16] px-3 text-xs text-white outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
            </div>
            <div className="col-span-2 lg:col-span-5">
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Description / Rules</label>
              <input type="text" value={newTour.description} onChange={e => setNewTour({...newTour, description: e.target.value})} placeholder="Top 10 traders win cash prizes." className="w-full h-8 rounded-lg border bg-[#080D16] px-3 text-xs text-white outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
            </div>
            
            <div className="col-span-1 border-t pt-3" style={{ borderColor: BORDER }}>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Entry Fee ($)</label>
              <input type="number" value={newTour.entry_fee} onChange={e => setNewTour({...newTour, entry_fee: Number(e.target.value)})} className="w-full h-8 rounded-lg border bg-[#080D16] px-3 text-xs text-white outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
            </div>
            <div className="col-span-1 border-t pt-3" style={{ borderColor: BORDER }}>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Rebuy Cost ($)</label>
              <input type="number" min="0" value={newTour.rebuy_cost} onChange={e => setNewTour({...newTour, rebuy_cost: Number(e.target.value)})} className="w-full h-8 rounded-lg border bg-[#080D16] px-3 text-xs text-white outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
            </div>
            <div className="col-span-1 border-t pt-3" style={{ borderColor: BORDER }}>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Prize Pool ($)</label>
              <input type="number" value={newTour.prize_pool} onChange={e => setNewTour({...newTour, prize_pool: Number(e.target.value)})} className="w-full h-8 rounded-lg border bg-[#080D16] px-3 text-xs text-[#F59E0B] font-mono font-bold outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
            </div>
            <div className="col-span-1 border-t pt-3" style={{ borderColor: BORDER }}>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Winners</label>
              <input type="number" min="1" value={newTour.number_of_winners}
                onChange={e => {
                  const num = Math.max(1, Number(e.target.value));
                  setNewTour(prev => ({ ...prev, number_of_winners: num, prize_distribution: rebuildDistribution(num, prev.prize_distribution) }));
                }}
                className="w-full h-8 rounded-lg border bg-[#080D16] px-3 text-xs text-white font-mono font-bold outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
            </div>
            <div className="col-span-1 sm:col-span-2 border-t pt-3" style={{ borderColor: BORDER }}>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Prize Distribution</label>
              <div className="space-y-1">
                {parseDistribution(newTour.prize_distribution).map((entry) => (
                  <div key={entry.position} className="flex items-center gap-2">
                    <span className="w-6 text-[11px] font-semibold text-[#8D9AAF]">{entry.label}</span>
                    <input
                      type="number" min="0" max="100"
                      value={Math.round(entry.share * 100)}
                      onChange={e => {
                        const pct = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                        const cur = parseDistribution(newTour.prize_distribution);
                        setNewTour(prev => ({ ...prev, prize_distribution: JSON.stringify(cur.map(d => d.position === entry.position ? { ...d, share: pct / 100 } : d)) }));
                      }}
                      className="w-14 h-6 rounded border bg-[#080D16] text-center font-mono text-xs text-white outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
                    <span className="text-[10px] text-[#5E6B7D]">%</span>
                    <span className="font-mono text-[10px] text-[#00C98D]">${Math.round((newTour.prize_pool ?? 0) * entry.share).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-1 border-t pt-3" style={{ borderColor: BORDER }}>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Start Balance ($)</label>
              <input type="number" value={newTour.starting_balance} onChange={e => setNewTour({...newTour, starting_balance: Number(e.target.value)})} className="w-full h-8 rounded-lg border bg-[#080D16] px-3 text-xs font-mono text-[#00C98D] font-bold outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
            </div>

            <div className="col-span-1 lg:col-span-1 border-t pt-3" style={{ borderColor: BORDER }}>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Starts (Local)</label>
              <input type="text" value={newTour.start_date} onChange={e => setNewTour({...newTour, start_date: e.target.value})} placeholder="2026-06-19T09:00" className="w-full h-8 rounded-lg border bg-[#080D16] px-2 text-xs font-mono text-white outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
            </div>
            <div className="col-span-1 lg:col-span-1 border-t pt-3" style={{ borderColor: BORDER }}>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]">Ends (Local)</label>
              <input type="text" value={newTour.end_date} onChange={e => setNewTour({...newTour, end_date: e.target.value})} placeholder="2026-06-19T21:00" className="w-full h-8 rounded-lg border bg-[#080D16] px-2 text-xs font-mono text-white outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
            </div>

            <div className="col-span-1 lg:col-span-1 flex items-end">
              <button onClick={handleCreateTour} className="w-full h-8 rounded-lg bg-[#00C98D] px-4 text-xs font-bold text-black hover:bg-[#00b37d] transition-colors">
                Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 rounded-lg border bg-[#0D1420] p-3" style={{ borderColor: BORDER }}>
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input type="text" placeholder="Search tournaments..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full h-8 rounded-lg border bg-[#080D16] pl-8 pr-3 text-xs text-white outline-none placeholder:text-gray-500 focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
        </div>
      </div>

      {/* Dense Table */}
      <div className="overflow-hidden rounded-lg border bg-[#0D1420]" style={{ borderColor: BORDER }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b bg-[#121B29] text-[10px] font-bold uppercase tracking-wider text-[#5E6B7D]" style={{ borderColor: BORDER }}>
                <th className="px-4 py-3">TOURNAMENT TITLE</th>
                <th className="px-4 py-3">ENTRY FEE</th>
                <th className="px-4 py-3">REBUY COST</th>
                <th className="px-4 py-3 text-[#F59E0B]">PRIZE POOL</th>
                <th className="px-4 py-3">WINNERS</th>
                <th className="px-4 py-3 text-[#00C98D]">SANDBOX BAL</th>
                <th className="px-4 py-3">TIMELINE</th>
                <th className="px-4 py-3">STATUS</th>
                <th className="px-4 py-3 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202B3A]">
              {loading ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-xs text-[#5E6B7D]">Loading tournaments...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-xs text-[#5E6B7D]">No tournaments configured. Deploy one to begin.</td></tr>
              ) : filtered.map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-2.5">
                    {editingRowId === t.id ? (
                      <div className="space-y-1.5">
                        <input type="text" value={editDrafts[t.id]?.title ?? t.title} onChange={(e) => setEditDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], title: e.target.value } }))} className="w-full h-7 rounded border bg-[#080D16] px-2 text-xs text-white outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
                        <input type="text" value={editDrafts[t.id]?.description ?? t.description ?? ""} onChange={(e) => setEditDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], description: e.target.value } }))} placeholder="Description" className="w-full h-7 rounded border bg-[#080D16] px-2 text-xs text-[#8D9AAF] outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
                      </div>
                    ) : (
                      <>
                        <div className="font-bold text-white text-xs">{t.title}</div>
                        <div className="text-[10px] text-[#5E6B7D] max-w-[200px] truncate">{t.description}</div>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono">
                    {editingRowId === t.id ? (
                      <input type="number" value={editDrafts[t.id]?.entry_fee ?? t.entry_fee} onChange={(e) => setEditDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], entry_fee: Number(e.target.value) } }))} className="w-20 h-7 rounded border bg-[#080D16] px-2 text-xs text-white outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
                    ) : (
                      <span className="font-bold">{t.entry_fee === 0 ? <span className="text-[#00C98D]">FREE</span> : `$${t.entry_fee}`}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono font-bold">
                    {editingRebuyId === t.id ? (
                      <input
                        type="number" min="0"
                        value={rebuyDrafts[t.id] ?? Number(t.rebuy_cost ?? 0)}
                        onChange={(e) => setRebuyDrafts((current) => ({ ...current, [t.id]: Number(e.target.value) }))}
                        className="w-20 h-7 rounded border bg-[#080D16] px-2 text-xs text-white outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }}
                      />
                    ) : editingRowId === t.id ? (
                      <input type="number" min="0" value={editDrafts[t.id]?.rebuy_cost ?? t.rebuy_cost} onChange={(e) => setEditDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], rebuy_cost: Number(e.target.value) } }))} className="w-20 h-7 rounded border bg-[#080D16] px-2 text-xs text-white outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
                    ) : (
                      t.rebuy_cost === 0 ? <span className="text-[#00C98D]">FREE</span> : `$${t.rebuy_cost}`
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono font-bold text-[#F59E0B]">
                    {editingRowId === t.id ? (
                      <input type="number" value={editDrafts[t.id]?.prize_pool ?? t.prize_pool} onChange={(e) => setEditDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], prize_pool: Number(e.target.value) } }))} className="w-20 h-7 rounded border bg-[#080D16] px-2 text-xs text-[#F59E0B] outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
                    ) : (
                      `$${t.prize_pool}`
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono font-bold text-white">
                    {editingRowId === t.id ? (
                      <input type="number" min="1" value={editDrafts[t.id]?.number_of_winners ?? t.number_of_winners}
                        onChange={e => {
                          const num = Math.max(1, Number(e.target.value));
                          const existing = editDrafts[t.id]?.prize_distribution ?? JSON.stringify((t as any).prize_distribution ?? []);
                          setEditDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], number_of_winners: num, prize_distribution: rebuildDistribution(num, existing) } }));
                        }}
                        className="w-14 h-7 rounded border bg-[#080D16] px-2 text-xs text-white outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
                    ) : (
                      t.number_of_winners
                    )}
                  </td>
                  <td className="px-4 py-2.5 font-mono font-bold text-[#00C98D]">
                    {editingRowId === t.id ? (
                      <input type="number" value={editDrafts[t.id]?.starting_balance ?? t.starting_balance} onChange={(e) => setEditDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], starting_balance: Number(e.target.value) } }))} className="w-20 h-7 rounded border bg-[#080D16] px-2 text-xs text-[#00C98D] outline-none focus:border-[#00C98D]" style={{ borderColor: BORDER }} />
                    ) : (
                      `$${t.starting_balance}`
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-[10px] font-mono text-[#8D9AAF]">
                    {editingRowId === t.id ? (
                      <div className="space-y-1">
                        <input type="text" value={editDrafts[t.id]?.start_date?.slice(0, 16) ?? t.start_date.slice(0, 16)} onChange={(e) => setEditDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], start_date: e.target.value } }))} className="w-full h-6 rounded border bg-[#080D16] px-1 text-[10px] text-white outline-none" style={{ borderColor: BORDER }} />
                        <input type="text" value={editDrafts[t.id]?.end_date?.slice(0, 16) ?? t.end_date.slice(0, 16)} onChange={(e) => setEditDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], end_date: e.target.value } }))} className="w-full h-6 rounded border bg-[#080D16] px-1 text-[10px] text-white outline-none" style={{ borderColor: BORDER }} />
                      </div>
                    ) : (
                      <>
                        <div>S: {new Date(t.start_date).toLocaleString("en-GB", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
                        <div>E: {new Date(t.end_date).toLocaleString("en-GB", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <select 
                      value={t.status}
                      onChange={(e) => handleUpdateStatus(t.id, e.target.value)}
                      className="rounded bg-[#080D16] border border-[#202B3A] px-2 py-1 text-[10px] font-bold text-white outline-none"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {editingRowId === t.id ? (
                        <>
                          <button onClick={() => handleSaveEdit(t.id)} className="rounded border border-[#00C98D]/30 p-1 text-[#00C98D] hover:bg-[#00C98D] hover:text-black transition-colors">
                            <Save size={12} />
                          </button>
                          <button onClick={() => { setEditingRowId(null); setEditDrafts((d) => { const next = { ...d }; delete next[t.id]; return next; }); }} className="rounded border border-[#EF4444]/30 p-1 text-[#EF4444] hover:bg-[#EF4444] hover:text-white transition-colors">
                            <X size={12} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingRowId(t.id); setEditDrafts((d) => ({ ...d, [t.id]: { prize_distribution: JSON.stringify((t as any).prize_distribution ?? []), number_of_winners: t.number_of_winners } })); setEditingRebuyId(null); }} className="rounded border border-[#202B3A] p-1 text-[#8D9AAF] hover:text-white transition-colors">
                            <Edit size={12} />
                          </button>
                          <button onClick={() => handleDelete(t.id)} className="rounded border border-[#EF4444]/30 p-1 text-[#EF4444] hover:bg-[#EF4444] hover:text-white transition-colors">
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TournamentsAdmin;
