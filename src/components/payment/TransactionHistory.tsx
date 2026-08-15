import { useState, useMemo } from "react";
import { Filter, ChevronDown, ChevronUp, CheckCircle, Clock, XCircle, Loader2, Wallet, CreditCard, Gift, Download, Upload, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Transaction {
  id: string;
  type: "deposit" | "withdrawal" | "bonus";
  method: string;
  coin?: string;
  network?: string;
  amount: number;
  status: "completed" | "pending" | "processing" | "failed" | "rejected";
  date: string;
  txHash?: string;
}

const STATUS_STYLES = {
  completed: "bg-green-500/10 text-green-400 border-green-500/20",
  pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  processing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  failed: "bg-red-500/10 text-red-400 border-red-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
};

const TYPE_ICONS = {
  deposit: Wallet,
  withdrawal: CreditCard,
  bonus: Gift,
};

interface TransactionHistoryProps {
  transactions: Transaction[];
  loading: boolean;
  filter: "all" | "deposits" | "withdrawals" | "bonuses";
  setFilter: (filter: "all" | "deposits" | "withdrawals" | "bonuses") => void;
  search: string;
  setSearch: (search: string) => void;
  onRefresh: () => void;
}

export function TransactionHistory({
  transactions,
  loading,
  filter,
  setFilter,
  search,
  setSearch,
  onRefresh,
}: TransactionHistoryProps) {
  const [sortBy, setSortBy] = useState<"date" | "amount" | "status">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    if (filter !== "all") {
      result = result.filter(t => t.type === filter);
    }

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(t => 
        t.id.toLowerCase().includes(term) ||
        t.method.toLowerCase().includes(term) ||
        t.coin?.toLowerCase().includes(term) ||
        t.network?.toLowerCase().includes(term) ||
        t.amount.toString().includes(term) ||
        t.status.toLowerCase().includes(term)
      );
    }

    result.sort((a, b) => {
      let aVal: any, bVal: any;
      switch (sortBy) {
        case "date":
          aVal = new Date(a.date).getTime();
          bVal = new Date(b.date).getTime();
          break;
        case "amount":
          aVal = a.amount;
          bVal = b.amount;
          break;
        case "status":
          aVal = a.status;
          bVal = b.status;
          break;
        default:
          aVal = 0; bVal = 0;
      }
      return sortOrder === "asc" ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [filter, search, sortBy, sortOrder, transactions]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-3.5 w-3.5 text-green-400" />;
      case "pending": return <Clock className="h-3.5 w-3.5 text-amber-400" />;
      case "processing": return <Loader2 className="h-3.5 w-3.5 text-blue-400 animate-spin" />;
      case "failed": return <XCircle className="h-3.5 w-3.5 text-red-400" />;
      case "rejected": return <XCircle className="h-3.5 w-3.5 text-red-400" />;
      default: return <Clock className="h-3.5 w-3.5 text-white/50" />;
    }
  };

  const getTypeIcon = (type: string) => {
    const Icon = TYPE_ICONS[type as keyof typeof TYPE_ICONS] || Wallet;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Transaction History</h1>
          <p className="text-white/60">View all your deposits, withdrawals, and bonuses</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            className="h-10 px-4 rounded-lg bg-white/5 border-white/10 text-white text-sm font-medium"
            onClick={onRefresh}
            disabled={loading}
          >
            <Loader2 className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[#0a0d17] border border-white/10 rounded-xl text-white outline-none placeholder:text-white/30 focus:border-[#0fa053]/50 focus:ring-1 focus:ring-[#0fa053]/20"
          />
        </div>
        <div className="flex items-center gap-3">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="bg-[#0a0d17] border border-white/10 rounded-xl text-white w-40">
              <SelectValue placeholder="All" />
            </SelectTrigger>
            <SelectContent className="bg-[#141a2a] border border-white/10">
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="deposits">Deposits</SelectItem>
              <SelectItem value="withdrawals">Withdrawals</SelectItem>
              <SelectItem value="bonuses">Bonuses</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="bg-[#0a0d17] border border-white/10 rounded-xl text-white w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-[#141a2a] border border-white/10">
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="amount">Amount</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="bg-white/5 hover:bg-white/10"
          >
            {sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-white/10 bg-white/5">
              <tr>
                <th className="px-6 py-4 text-left font-semibold text-white/60">Transaction</th>
                <th className="px-6 py-4 text-left font-semibold text-white/60">Method</th>
                <th className="px-6 py-4 text-left font-semibold text-white/60">Amount</th>
                <th className="px-6 py-4 text-left font-semibold text-white/60">Status</th>
                <th className="px-6 py-4 text-left font-semibold text-white/60">Date</th>
                <th className="px-6 py-4 text-right font-semibold text-white/60">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {transactions.length === 0 && loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-white/50" />
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/5 mb-4">
                      <Filter className="h-6 w-6 text-white/40" />
                    </div>
                    <h3 className="text-lg font-bold text-white">No transactions found</h3>
                    <p className="mt-2 text-white/50">Try adjusting your filters or search terms</p>
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5">
                          {getTypeIcon(tx.type)}
                        </div>
                        <div>
                          <p className="font-medium text-white">{tx.id}</p>
                          <p className="text-xs text-white/50 capitalize">{tx.type}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{tx.method}</span>
                        {(tx.coin || tx.network) && (
                          <span className="text-xs text-white/40 px-2 py-0.5 rounded bg-white/5">
                            {tx.coin} {tx.network ? `— ${tx.network}` : ""}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${tx.type === "withdrawal" ? "text-red-400" : "text-green-400"}`}>
                          {tx.type === "withdrawal" ? "-" : "+"}${tx.amount.toFixed(2)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className={STATUS_STYLES[tx.status] || "bg-white/10 text-white/60"}>
                        <div className="flex items-center gap-1.5">
                          {getStatusIcon(tx.status)}
                          <span className="capitalize">{tx.status}</span>
                        </div>
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-white/70">{tx.date}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {tx.txHash && (
                          <button
                            className="text-white/50 hover:text-white/80 text-xs flex items-center gap-1"
                            title="View on explorer"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            View
                          </button>
                        )}
                        <button className="text-white/50 hover:text-white/80 text-xs flex items-center gap-1">
                          Details
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
    </div>
  );
}