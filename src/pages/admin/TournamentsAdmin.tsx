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

  const handleSaveRebuyCost = async (id: string) => {
    const draftValue = Number(rebuyDrafts[id] ?? 0);
    if (draftValue < 0) {
      toast({ title: "Validation Error", description: "Rebuy cost cannot be negative.", variant: "destructive" });
      return;
    }

    const { error } = await api.from('tournaments').update({ rebuy_cost: draftValue }).eq('id', id);
    if (error) {
      toast({ title: "Failed to update rebuy cost", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Rebuy cost updated" });
    setTournaments((current) => current.map((t) => (t.id === id ? { ...t, rebuy_cost: draftValue } : t)));
    setEditingRebuyId(null);
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
    if (newTour.rebuy_cost < 0) {
      toast({ title: "Validation Error", description: "Rebuy cost cannot be negative.", variant: "destructive" });
      return;
    }

    // Ensure dates are correctly formatted for timestamptz (ISO strings from datetime-local input lack the Z or timezone info, but Supabase casts it fine usually if valid).
    // Let's force an ISO string conversion.
    const sDate = new Date(newTour.start_date).toISOString();
    const eDate = new Date(newTour.end_date).toISOString();

    let prizeDistribution: any = undefined;
    try { prizeDistribution = JSON.parse(newTour.prize_distribution); } catch {}

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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Trophy className="text-yellow-500" /> Live Tournaments Engine</h2>
          <p className="text-sm text-slate-300 mt-1">Configure competition schedules, sandbox balances, prize pools, and entry rules.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
             onClick={() => setIsCreating(!isCreating)}
             className="flex items-center gap-2 bg-[#0fa053] hover:bg-[#1a1e2b] text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-[#0fa053]/20"
          >
            <Plus size={16} /> {isCreating ? "Cancel" : "Create Tournament"}
          </button>
        </div>
      </div>

      {isCreating && (
        <div className="bg-[#1a1e2b] border border-[#2a2f42] rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4">New Tournament Config</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 items-end">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Title</label>
              <input type="text" value={newTour.title} onChange={e => setNewTour({...newTour, title: e.target.value})} placeholder="Weekend Alpha Cup" className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none" />
            </div>
            <div className="col-span-2 lg:col-span-5">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Description / Rules</label>
              <input type="text" value={newTour.description} onChange={e => setNewTour({...newTour, description: e.target.value})} placeholder="Top 10 traders win cash prizes. (mention winners here)" className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none" />
            </div>
            
            <div className="col-span-1 border-t border-[#2a2f42] pt-4">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Entry Fee ($)</label>
              <input type="number" value={newTour.entry_fee} onChange={e => setNewTour({...newTour, entry_fee: Number(e.target.value)})} className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none" />
            </div>
            <div className="col-span-1 border-t border-[#2a2f42] pt-4">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Rebuy Cost ($)</label>
              <input type="number" min="0" value={newTour.rebuy_cost} onChange={e => setNewTour({...newTour, rebuy_cost: Number(e.target.value)})} className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none" />
            </div>
            <div className="col-span-1 border-t border-[#2a2f42] pt-4">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Prize Pool ($)</label>
              <input type="number" value={newTour.prize_pool} onChange={e => setNewTour({...newTour, prize_pool: Number(e.target.value)})} className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-4 py-2 text-sm text-yellow-500 font-bold focus:border-[#0fa053] outline-none" />
            </div>
             <div className="col-span-1 border-t border-[#2a2f42] pt-4">
               <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Winners</label>
               <input type="number" min="1" value={newTour.number_of_winners}
                 onChange={e => {
                   const num = Math.max(1, Number(e.target.value));
                   setNewTour(prev => ({ ...prev, number_of_winners: num, prize_distribution: rebuildDistribution(num, prev.prize_distribution) }));
                 }}
                 className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-4 py-2 text-sm text-white font-bold focus:border-[#0fa053] outline-none" />
             </div>
             <div className="col-span-1 sm:col-span-2 border-t border-[#2a2f42] pt-4">
               <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Prize Distribution</label>
               <div className="space-y-1.5">
                 {parseDistribution(newTour.prize_distribution).map((entry) => (
                   <div key={entry.position} className="flex items-center gap-2">
                     <span className="w-8 text-sm font-semibold text-slate-300">{entry.label}</span>
                     <div className="flex items-center gap-1.5 flex-1">
                       <input
                         type="number" min="0" max="100"
                         value={Math.round(entry.share * 100)}
                         onChange={e => {
                           const pct = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                           const cur = parseDistribution(newTour.prize_distribution);
                           setNewTour(prev => ({ ...prev, prize_distribution: JSON.stringify(cur.map(d => d.position === entry.position ? { ...d, share: pct / 100 } : d)) }));
                         }}
                         className="w-16 bg-[#0e1017] border border-[#2a2f42] rounded px-2 py-1 text-sm text-white text-center focus:border-[#0fa053] outline-none" />
                       <span className="text-xs text-slate-500">%</span>
                       <span className="text-xs text-green-400 font-mono">${Math.round(newTour.prize_pool * entry.share).toLocaleString()}</span>
                     </div>
                   </div>
                 ))}
               </div>
             </div>
              <div className="col-span-1 border-t border-[#2a2f42] pt-4">
               <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Start Balance ($)</label>
              <input type="number" value={newTour.starting_balance} onChange={e => setNewTour({...newTour, starting_balance: Number(e.target.value)})} className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-4 py-2 text-sm text-green-400 font-bold focus:border-[#0fa053] outline-none" />
            </div>

            <div className="col-span-1 lg:col-span-1 border-t border-[#2a2f42] pt-4">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Starts (Local)</label>
              <input type="text" value={newTour.start_date} onChange={e => setNewTour({...newTour, start_date: e.target.value})} placeholder="2026-06-19T09:00" className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-2 py-2 text-xs text-white focus:border-[#0fa053] outline-none" />
            </div>
            <div className="col-span-1 lg:col-span-1 border-t border-[#2a2f42] pt-4">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-2">Ends (Local)</label>
              <input type="text" value={newTour.end_date} onChange={e => setNewTour({...newTour, end_date: e.target.value})} placeholder="2026-06-19T21:00" className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-2 py-2 text-xs text-white focus:border-[#0fa053] outline-none" />
            </div>

            <div className="col-span-1 lg:col-span-1 flex justify-end">
               <button onClick={handleCreateTour} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors w-full h-[38px] flex items-center justify-center">
                 Publish
               </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#1a1e2b] border border-[#2a2f42] rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-[#2a2f42] flex justify-between items-center bg-[#1a1e2b]">
          <div className="flex gap-2 relative w-full max-w-sm">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
             <input type="text" placeholder="Search tournaments..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-[#0fa053] outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm text-slate-200">
            <thead className="text-xs uppercase bg-[#1a1e2b] text-slate-300 border-b border-[#2a2f42]">
              <tr>
                <th className="px-6 py-3 font-semibold">Tournament Title</th>
                <th className="px-6 py-3 font-semibold">Entry Fee</th>
                <th className="px-6 py-3 font-semibold">Rebuy Cost</th>
                <th className="px-6 py-3 font-semibold text-yellow-500">Prize Pool</th>
                <th className="px-6 py-3 font-semibold">Winners</th>
                <th className="px-6 py-3 font-semibold text-green-400">Sandbox Bal</th>
                <th className="px-6 py-3 font-semibold">Timeline</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                  <tr><td colSpan={9} className="text-center py-8 text-slate-400">Loading tournaments...</td></tr>
               ) : filtered.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-8 text-slate-400">No tournaments configured. Deploy one to begin.</td></tr>
              ) : filtered.map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4">
                      {editingRowId === t.id ? (
                      <div className="space-y-2">
                        <input type="text" value={editDrafts[t.id]?.title ?? t.title} onChange={(e) => setEditDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], title: e.target.value } }))} className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-3 py-1.5 text-sm text-white focus:border-[#0fa053] outline-none" />
                        <input type="text" value={editDrafts[t.id]?.description ?? t.description ?? ""} onChange={(e) => setEditDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], description: e.target.value } }))} placeholder="Description" className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:border-[#0fa053] outline-none" />
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Prize Distribution</label>
                          <div className="text-[10px] text-slate-500 mb-1.5">{editDrafts[t.id]?.number_of_winners ?? (t as any).number_of_winners ?? 1} winner{(editDrafts[t.id]?.number_of_winners ?? (t as any).number_of_winners ?? 1) !== 1 ? "s" : ""}</div>
                          <div className="space-y-1">
                            {parseDistribution(editDrafts[t.id]?.prize_distribution ?? JSON.stringify((t as any).prize_distribution ?? [])).map((entry) => (
                              <div key={entry.position} className="flex items-center gap-2">
                                <span className="w-6 text-[11px] font-semibold text-slate-400">{entry.label}</span>
                                <input
                                  type="number" min="0" max="100"
                                  value={Math.round(entry.share * 100)}
                                  onChange={e => {
                                    const pct = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                                    const cur = parseDistribution(editDrafts[t.id]?.prize_distribution ?? JSON.stringify((t as any).prize_distribution ?? []));
                                    const updated = JSON.stringify(cur.map(d => d.position === entry.position ? { ...d, share: pct / 100 } : d));
                                    setEditDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], prize_distribution: updated } }));
                                  }}
                                  className="w-14 bg-[#0e1017] border border-[#2a2f42] rounded px-1.5 py-1 text-[11px] text-white text-center focus:border-[#0fa053] outline-none" />
                                <span className="text-[10px] text-slate-500">%</span>
                                <span className="text-[10px] text-green-400 font-mono">${Math.round(Number((t as any).prize_pool ?? 0) * entry.share).toLocaleString()}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="font-bold text-white text-base">{t.title}</div>
                        <div className="text-xs text-slate-400 max-w-[200px] truncate">{t.description}</div>
                      </>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingRowId === t.id ? (
                      <input type="number" value={editDrafts[t.id]?.entry_fee ?? t.entry_fee} onChange={(e) => setEditDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], entry_fee: Number(e.target.value) } }))} className="w-24 bg-[#0e1017] border border-[#2a2f42] rounded-lg px-3 py-1.5 text-sm text-white focus:border-[#0fa053] outline-none" />
                    ) : (
                      <span className="font-mono font-bold">{t.entry_fee === 0 ? <span className="text-green-400">FREE</span> : `$${t.entry_fee}`}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono font-bold">
                    {editingRebuyId === t.id ? (
                      <input
                        type="number"
                        min="0"
                        value={rebuyDrafts[t.id] ?? Number(t.rebuy_cost ?? 0)}
                        onChange={(e) => setRebuyDrafts((current) => ({ ...current, [t.id]: Number(e.target.value) }))}
                        className="w-28 bg-[#0e1017] border border-[#2a2f42] rounded-lg px-3 py-2 text-sm text-white focus:border-[#0fa053] outline-none"
                      />
                    ) : editingRowId === t.id ? (
                      <input type="number" min="0" value={editDrafts[t.id]?.rebuy_cost ?? t.rebuy_cost} onChange={(e) => setEditDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], rebuy_cost: Number(e.target.value) } }))} className="w-24 bg-[#0e1017] border border-[#2a2f42] rounded-lg px-3 py-1.5 text-sm text-white focus:border-[#0fa053] outline-none" />
                    ) : (
                      t.rebuy_cost === 0 ? <span className="text-green-400">FREE</span> : `$${t.rebuy_cost}`
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingRowId === t.id ? (
                      <input type="number" value={editDrafts[t.id]?.prize_pool ?? t.prize_pool} onChange={(e) => setEditDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], prize_pool: Number(e.target.value) } }))} className="w-24 bg-[#0e1017] border border-[#2a2f42] rounded-lg px-3 py-1.5 text-sm text-yellow-500 font-bold focus:border-[#0fa053] outline-none" />
                    ) : (
                      <span className="font-mono font-bold text-yellow-500">${t.prize_pool}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingRowId === t.id ? (
                      <input type="number" min="1" value={editDrafts[t.id]?.number_of_winners ?? t.number_of_winners}
                        onChange={e => {
                          const num = Math.max(1, Number(e.target.value));
                          const existing = editDrafts[t.id]?.prize_distribution ?? JSON.stringify((t as any).prize_distribution ?? []);
                          setEditDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], number_of_winners: num, prize_distribution: rebuildDistribution(num, existing) } }));
                        }}
                        className="w-16 bg-[#0e1017] border border-[#2a2f42] rounded-lg px-3 py-1.5 text-sm text-white font-bold focus:border-[#0fa053] outline-none" />
                    ) : (
                      <span className="font-mono font-bold">{t.number_of_winners}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {editingRowId === t.id ? (
                      <input type="number" value={editDrafts[t.id]?.starting_balance ?? t.starting_balance} onChange={(e) => setEditDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], starting_balance: Number(e.target.value) } }))} className="w-24 bg-[#0e1017] border border-[#2a2f42] rounded-lg px-3 py-1.5 text-sm text-green-400 font-bold focus:border-[#0fa053] outline-none" />
                    ) : (
                      <span className="font-mono font-medium text-green-400">${t.starting_balance}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-xs font-mono">
                    {editingRowId === t.id ? (
                      <div className="space-y-1.5">
                        <input type="text" value={editDrafts[t.id]?.start_date?.slice(0, 16) ?? t.start_date.slice(0, 16)} onChange={(e) => setEditDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], start_date: e.target.value } }))} placeholder="2026-06-19T09:00" className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-2 py-1 text-xs text-white focus:border-[#0fa053] outline-none" />
                        <input type="text" value={editDrafts[t.id]?.end_date?.slice(0, 16) ?? t.end_date.slice(0, 16)} onChange={(e) => setEditDrafts((d) => ({ ...d, [t.id]: { ...d[t.id], end_date: e.target.value } }))} placeholder="2026-06-19T21:00" className="w-full bg-[#0e1017] border border-[#2a2f42] rounded-lg px-2 py-1 text-xs text-white focus:border-[#0fa053] outline-none" />
                      </div>
                    ) : (
                      <>
                        <div className="text-slate-300">S: {new Date(t.start_date).toLocaleString()}</div>
                        <div className="text-slate-400">E: {new Date(t.end_date).toLocaleString()}</div>
                      </>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={t.status}
                      onChange={(e) => handleUpdateStatus(t.id, e.target.value)}
                      className={`px-2 py-1 rounded bg-[#0e1017] border text-xs font-bold uppercase tracking-wider outline-none ${
                        t.status === 'active' ? 'text-green-400 border-[#0fa053]/30' : 
                        t.status === 'completed' ? 'text-[#0fa053] border-[#0fa053]/30' : 
                        t.status === 'cancelled' ? 'text-red-400 border-red-500/30' : 
                        'text-yellow-400 border-yellow-500/30'
                      }`}
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="active">Active</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {editingRowId === t.id ? (
                        <>
                          <button onClick={() => handleSaveEdit(t.id)} className="p-1.5 bg-[#1a1e2b] text-green-400 hover:text-white rounded transition-colors" title="Save All Changes">
                            <Save size={16} />
                          </button>
                          <button onClick={() => { setEditingRowId(null); setEditDrafts((d) => { const next = { ...d }; delete next[t.id]; return next; }); }} className="p-1.5 bg-[#1a1e2b] text-slate-300 hover:text-red-400 rounded transition-colors" title="Cancel Editing">
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => { setEditingRowId(t.id); setEditDrafts((d) => ({ ...d, [t.id]: { prize_distribution: JSON.stringify((t as any).prize_distribution ?? []), number_of_winners: t.number_of_winners } })); setEditingRebuyId(null); }} className="p-1.5 bg-[#1a1e2b] text-slate-300 hover:text-[#0fa053] rounded transition-colors" title="Edit All Fields">
                            <Edit size={16} />
                          </button>
                          {editingRebuyId === t.id ? (
                            <button onClick={() => handleSaveRebuyCost(t.id)} className="p-1.5 bg-[#1a1e2b] text-slate-300 hover:text-green-400 rounded transition-colors" title="Save Rebuy Cost">
                              <Save size={16} />
                            </button>
                          ) : editingRowId !== t.id ? (
                            <button onClick={() => { setEditingRebuyId(t.id); setRebuyDrafts((current) => ({ ...current, [t.id]: Number(t.rebuy_cost ?? 0) })); }} className="p-1.5 bg-[#1a1e2b] text-slate-300 hover:text-[#0fa053] rounded transition-colors" title="Edit Rebuy Cost">
                              <Edit size={16} />
                            </button>
                          ) : null}
                          <button onClick={() => handleDelete(t.id)} className="p-1.5 bg-[#1a1e2b] text-slate-300 hover:text-red-400 rounded transition-colors" title="Delete Tournament">
                            <Trash2 size={16} />
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


