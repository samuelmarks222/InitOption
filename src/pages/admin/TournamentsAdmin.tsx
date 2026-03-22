import { useState, useEffect } from "react";
import { Search, Plus, Trash2, Edit, Save, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Database } from "@/integrations/supabase/types";

type Tournament = Database["public"]["Tables"]["tournaments"]["Row"];

const TournamentsAdmin = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  
  const [newTour, setNewTour] = useState({
    title: "", description: "", entry_fee: 0, prize_pool: 0, 
    starting_balance: 100, status: "upcoming" as const,
    start_date: new Date().toISOString().slice(0, 16),
    end_date: new Date(Date.now() + 86400000).toISOString().slice(0, 16)
  });

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('tournaments').select('*').order('created_at', { ascending: false });
    if (error) console.error("Error fetching tournaments:", error);
    else setTournaments(data || []);
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this tournament? This will also wipe its participant data.")) return;
    const { error } = await supabase.from('tournaments').delete().eq('id', id);
    if (error) toast({ title: "Failed to delete", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Tournament deleted!" });
      setTournaments(tournaments.filter(t => t.id !== id));
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('tournaments').update({ status: newStatus as any }).eq('id', id);
    if (error) toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    else {
      toast({ title: `Tournament status changed to ${newStatus}` });
      setTournaments(tournaments.map(t => t.id === id ? { ...t, status: newStatus as any } : t));
    }
  };

  const handleCreateTour = async () => {
    if (!newTour.title) {
      toast({ title: "Validation Error", description: "Tournament title is required.", variant: "destructive" });
      return;
    }

    // Ensure dates are correctly formatted for timestamptz (ISO strings from datetime-local input lack the Z or timezone info, but Supabase casts it fine usually if valid).
    // Let's force an ISO string conversion.
    const sDate = new Date(newTour.start_date).toISOString();
    const eDate = new Date(newTour.end_date).toISOString();

    const { data, error } = await supabase.from('tournaments').insert({
      title: newTour.title,
      description: newTour.description,
      entry_fee: Number(newTour.entry_fee),
      prize_pool: Number(newTour.prize_pool),
      starting_balance: Number(newTour.starting_balance),
      start_date: sDate,
      end_date: eDate,
      status: newTour.status
    }).select().single();

    if (error) {
      toast({ title: "Error creating tournament", description: error.message, variant: "destructive" });
    } else if (data) {
      toast({ title: "Tournament created successfully!" });
      setTournaments([data, ...tournaments]);
      setIsCreating(false);
    }
  };

  const filtered = tournaments.filter(t => t.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2"><Trophy className="text-yellow-500" /> Live Tournaments Engine</h2>
          <p className="text-sm text-gray-400 mt-1">Configure competition schedules, sandbox balances, prize pools, and entry rules.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
             onClick={() => setIsCreating(!isCreating)}
             className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-500/20"
          >
            <Plus size={16} /> {isCreating ? "Cancel" : "Create Tournament"}
          </button>
        </div>
      </div>

      {isCreating && (
        <div className="bg-[#11161d] border border-white/5 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4">New Tournament Config</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 items-end">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Title</label>
              <input type="text" value={newTour.title} onChange={e => setNewTour({...newTour, title: e.target.value})} placeholder="Weekend Alpha Cup" className="w-full bg-[#0b0e14] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-blue-500 outline-none" />
            </div>
            <div className="col-span-2 lg:col-span-4">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Description / Rules</label>
              <input type="text" value={newTour.description} onChange={e => setNewTour({...newTour, description: e.target.value})} placeholder="Top 10 traders win cash prizes." className="w-full bg-[#0b0e14] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-blue-500 outline-none" />
            </div>
            
            <div className="col-span-1 border-t border-white/5 pt-4">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Entry Fee ($)</label>
              <input type="number" value={newTour.entry_fee} onChange={e => setNewTour({...newTour, entry_fee: Number(e.target.value)})} className="w-full bg-[#0b0e14] border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-blue-500 outline-none" />
            </div>
            <div className="col-span-1 border-t border-white/5 pt-4">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Prize Pool ($)</label>
              <input type="number" value={newTour.prize_pool} onChange={e => setNewTour({...newTour, prize_pool: Number(e.target.value)})} className="w-full bg-[#0b0e14] border border-white/10 rounded-lg px-4 py-2 text-sm text-yellow-500 font-bold focus:border-blue-500 outline-none" />
            </div>
             <div className="col-span-1 border-t border-white/5 pt-4">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Start Balance ($)</label>
              <input type="number" value={newTour.starting_balance} onChange={e => setNewTour({...newTour, starting_balance: Number(e.target.value)})} className="w-full bg-[#0b0e14] border border-white/10 rounded-lg px-4 py-2 text-sm text-green-400 font-bold focus:border-blue-500 outline-none" />
            </div>

            <div className="col-span-1 lg:col-span-1 border-t border-white/5 pt-4">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Starts (Local)</label>
              <input type="datetime-local" value={newTour.start_date} onChange={e => setNewTour({...newTour, start_date: e.target.value})} className="w-full bg-[#0b0e14] border border-white/10 rounded-lg px-2 py-2 text-xs text-white focus:border-blue-500 outline-none" />
            </div>
            <div className="col-span-1 lg:col-span-1 border-t border-white/5 pt-4">
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Ends (Local)</label>
              <input type="datetime-local" value={newTour.end_date} onChange={e => setNewTour({...newTour, end_date: e.target.value})} className="w-full bg-[#0b0e14] border border-white/10 rounded-lg px-2 py-2 text-xs text-white focus:border-blue-500 outline-none" />
            </div>

            <div className="col-span-1 lg:col-span-1 flex justify-end">
               <button onClick={handleCreateTour} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg text-sm font-bold transition-colors w-full h-[38px] flex items-center justify-center">
                 Publish
               </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#11161d] border border-white/5 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#1A1F26]">
          <div className="flex gap-2 relative w-full max-w-sm">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
             <input type="text" placeholder="Search tournaments..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-[#0b0e14] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-blue-500 outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm text-gray-300">
            <thead className="text-xs uppercase bg-[#11161d] text-gray-400 border-b border-white/5">
              <tr>
                <th className="px-6 py-3 font-semibold">Tournament Title</th>
                <th className="px-6 py-3 font-semibold">Entry Fee</th>
                <th className="px-6 py-3 font-semibold text-yellow-500">Prize Pool</th>
                <th className="px-6 py-3 font-semibold text-green-400">Sandbox Bal</th>
                <th className="px-6 py-3 font-semibold">Timeline</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                 <tr><td colSpan={7} className="text-center py-8 text-gray-500">Loading tournaments...</td></tr>
              ) : filtered.length === 0 ? (
                 <tr><td colSpan={7} className="text-center py-8 text-gray-500">No tournaments configured. Deploy one to begin.</td></tr>
              ) : filtered.map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.02]">
                  <td className="px-6 py-4">
                    <div className="font-bold text-white text-base">{t.title}</div>
                    <div className="text-xs text-gray-500 max-w-[200px] truncate">{t.description}</div>
                  </td>
                  <td className="px-6 py-4 font-mono font-bold">{t.entry_fee === 0 ? <span className="text-green-400">FREE</span> : `$${t.entry_fee}`}</td>
                  <td className="px-6 py-4 font-mono font-bold text-yellow-500">${t.prize_pool}</td>
                  <td className="px-6 py-4 font-mono font-medium text-green-400">${t.starting_balance}</td>
                  <td className="px-6 py-4 text-xs font-mono">
                    <div className="text-gray-400">S: {new Date(t.start_date).toLocaleString()}</div>
                    <div className="text-gray-500">E: {new Date(t.end_date).toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <select 
                      value={t.status}
                      onChange={(e) => handleUpdateStatus(t.id, e.target.value)}
                      className={`px-2 py-1 rounded bg-[#0b0e14] border text-xs font-bold uppercase tracking-wider outline-none ${
                        t.status === 'active' ? 'text-green-400 border-green-500/30' : 
                        t.status === 'completed' ? 'text-blue-400 border-blue-500/30' : 
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
                      <button onClick={() => handleDelete(t.id)} className="p-1.5 bg-white/5 text-gray-400 hover:text-red-400 rounded transition-colors" title="Delete Tournament">
                        <Trash2 size={16} />
                      </button>
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
