import { useState, useEffect } from "react";
import { Search, Save, Edit2, Wallet, X, Link as LinkIcon, Power, PowerOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CryptoMethod {
  id: string;
  coin_name: string;
  symbol: string;
  network: string;
  wallet_address: string;
  qr_code_url: string;
  status: string;
}

const CryptoPayments = () => {
  const [methods, setMethods] = useState<CryptoMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ wallet_address: string; qr_code_url: string }>({ wallet_address: "", qr_code_url: "" });

  useEffect(() => {
    fetchMethods();
  }, []);

  const fetchMethods = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('crypto_payment_methods').select('*').order('created_at');
    if (error) console.error("Error fetching crypto methods:", error);
    else setMethods(data || []);
    setLoading(false);
  };

  const handleToggleStatus = async (method: CryptoMethod) => {
    const newStatus = method.status === 'active' ? 'inactive' : 'active';
    const { error } = await supabase.from('crypto_payment_methods').update({ status: newStatus }).eq('id', method.id);
    if (error) toast({ title: "Status update failed", description: error.message, variant: "destructive" });
    else {
      toast({ title: `${method.symbol} (${method.network}) is now ${newStatus}!` });
      setMethods(methods.map(m => m.id === method.id ? { ...m, status: newStatus } : m));
    }
  };

  const startEdit = (method: CryptoMethod) => {
    setEditingId(method.id);
    setEditForm({ wallet_address: method.wallet_address || "", qr_code_url: method.qr_code_url || "" });
  };

  const saveEdit = async (method: CryptoMethod) => {
    const { error } = await supabase.from('crypto_payment_methods').update({
      wallet_address: editForm.wallet_address,
      qr_code_url: editForm.qr_code_url,
      updated_at: new Date().toISOString()
    }).eq('id', method.id);

    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Wallet address saved!" });
      setMethods(methods.map(m => m.id === method.id ? { ...m, wallet_address: editForm.wallet_address, qr_code_url: editForm.qr_code_url } : m));
      setEditingId(null);
    }
  };

  const filteredMethods = methods.filter(m => m.coin_name.toLowerCase().includes(searchTerm.toLowerCase()) || m.symbol.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Wallet className="text-blue-500" /> Crypto Payments Config
          </h2>
          <p className="text-sm text-gray-400 mt-1">Configure live wallet addresses and QR codes for user deposits & withdrawals.</p>
        </div>
      </div>

      <div className="bg-[#11161d] border border-white/5 rounded-2xl overflow-hidden shadow-lg">
        <div className="p-4 border-b border-white/5 flex justify-between items-center bg-[#1A1F26]">
          <div className="flex gap-2 relative w-full max-w-sm">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
             <input type="text" placeholder="Search by name or symbol..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-[#0b0e14] border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:border-blue-500 outline-none" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm text-gray-300">
            <thead className="text-xs uppercase bg-[#11161d] text-gray-400 border-b border-white/5">
              <tr>
                <th className="px-6 py-3 font-semibold">Coin</th>
                <th className="px-6 py-3 font-semibold">Network</th>
                <th className="px-6 py-3 font-semibold">Wallet Address</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                 <tr><td colSpan={5} className="text-center py-8 text-gray-500">Loading live crypto configurations...</td></tr>
              ) : filteredMethods.length === 0 ? (
                 <tr><td colSpan={5} className="text-center py-8 text-gray-500">No crypto methods found. Please apply the migration script.</td></tr>
              ) : filteredMethods.map((method) => {
                const isEditing = editingId === method.id;
                
                return (
                  <tr key={method.id} className="hover:bg-white/[0.02]">
                    <td className="px-6 py-4">
                      <div className="font-bold text-white text-base flex items-center gap-2">
                         <img src={`https://assets.coincap.io/assets/icons/${method.symbol.toLowerCase().replace('usdt', 'tether')}@2x.png`} className="w-6 h-6 rounded-full bg-white p-0.5" onError={(e) => { e.currentTarget.style.display = 'none'}} alt="" />
                         {method.coin_name}
                      </div>
                      <div className="text-xs text-blue-400 font-bold mt-1 tracking-wider">{method.symbol}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded bg-white/5 text-gray-300 text-xs font-bold tracking-wider border border-white/10">{method.network}</span>
                    </td>
                    <td className="px-6 py-4 w-96">
                      {isEditing ? (
                        <div className="space-y-2">
                           <div className="relative">
                             <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                             <input type="text" value={editForm.wallet_address} onChange={e => setEditForm({...editForm, wallet_address: e.target.value})} placeholder="Wallet Address" className="w-full bg-[#0b0e14] border border-blue-500/50 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white focus:border-blue-500 outline-none" />
                           </div>
                           <div className="relative">
                             <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
                             <input type="text" value={editForm.qr_code_url} onChange={e => setEditForm({...editForm, qr_code_url: e.target.value})} placeholder="QR Code Image URL (optional)" className="w-full bg-[#0b0e14] border border-blue-500/50 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white focus:border-blue-500 outline-none" />
                           </div>
                        </div>
                      ) : (
                        <div className="font-mono text-xs text-gray-400 truncate max-w-[300px]" title={method.wallet_address}>
                          {method.wallet_address || "Not Configured"}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 flex items-center gap-1.5 rounded-full text-xs font-bold tracking-wider w-fit ${
                        method.status === "active" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-500"
                      }`}>
                        {method.status === "active" ? <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" /> : <span className="w-1.5 h-1.5 rounded-full bg-red-500" />} 
                        {method.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-2">
                           <button onClick={() => saveEdit(method)} className="p-1.5 bg-green-500/20 text-green-400 hover:bg-green-500 hover:text-white rounded transition-colors" title="Save">
                             <Save size={16} />
                           </button>
                           <button onClick={() => setEditingId(null)} className="p-1.5 bg-white/5 text-gray-400 hover:text-white rounded transition-colors" title="Cancel">
                             <X size={16} />
                           </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => startEdit(method)} className="p-1.5 bg-white/5 text-gray-400 hover:text-white rounded transition-colors" title="Edit Parameters">
                            <Edit2 size={16} />
                          </button>
                          <button onClick={() => handleToggleStatus(method)} className={`p-1.5 rounded transition-colors ${method.status === "active" ? "bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white" : "bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-white"}`} title={method.status === "active" ? "Disable Asset" : "Enable Asset"}>
                            {method.status === "active" ? <PowerOff size={16} /> : <Power size={16} />}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default CryptoPayments;
