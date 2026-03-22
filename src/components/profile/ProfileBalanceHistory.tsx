import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, TrendingUp, Wallet, ArrowRightLeft, DollarSign } from "lucide-react";
import { useStatistics, Transaction } from "@/hooks/useStatistics";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useCurrency } from "@/contexts/CurrencyContext";

interface StatCardProps {
  bg: string;
  color: string;
  icon: typeof ArrowDownRight;
  title: string;
  value: string;
}

export const ProfileBalanceHistory = () => {
  const { transactions, balanceStats, equityCurve } = useStatistics();
  const [filter, setFilter] = useState("all"); // "all", "deposit", "withdrawal", "trade"
  const { formatMoney } = useCurrency();

  const filteredTransactions = transactions.filter(tx => filter === "all" || tx.type === filter);

  return (
    <div className="max-w-5xl text-white flex flex-col h-full">
      <h2 className="text-[24px] font-bold mb-6">Balance History</h2>
      <p className="-mt-3 mb-6 text-[13px] leading-6 text-[#88a3ac]">
        Pending deposit requests appear here right away, but they do not change your live balance until a finance admin approves them.
      </p>

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Deposits" value={formatMoney(balanceStats.totalDeposits)} icon={ArrowDownRight} color="text-green-500" bg="bg-green-500/10" />
        <StatCard title="Total Withdrawals" value={formatMoney(balanceStats.totalWithdrawals)} icon={ArrowUpRight} color="text-orange-500" bg="bg-orange-500/10" />
        <StatCard title="Net Deposit" value={formatMoney(balanceStats.netDeposit)} icon={Wallet} color="text-[#86c9d4]" bg="bg-[#0b2f3a]" />
        <StatCard title="Total Trade Volume" value={formatMoney(balanceStats.totalTradeVolume)} icon={TrendingUp} color="text-[#86c9d4]" bg="bg-[#0b2f3a]" />
      </div>

      {/* Equity Curve Chart */}
      <div className="bg-[#13232d] border border-[#0b2f3a] rounded-2xl p-6 mb-8 h-[300px]">
        <h3 className="text-[15px] font-bold mb-4">Account Growth (30 Days)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={equityCurve}>
            <XAxis dataKey="date" stroke="#68738D" tick={{ fill: '#68738D', fontSize: 11 }} />
            <YAxis stroke="#68738D" tick={{ fill: '#68738D', fontSize: 11 }} domain={['dataMin - 1000', 'dataMax + 1000']} />
            <Tooltip
              contentStyle={{ backgroundColor: "#13232d", borderColor: "#0b2f3a", borderRadius: "8px" }}
              itemStyle={{ color: "#fff" }}
              formatter={(value: number) => [formatMoney(value), "Balance"]}
            />
            <Line type="monotone" dataKey="balance" stroke="#86c9d4" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* History Table */}
      <div className="flex-1 bg-[#13232d] border border-[#0b2f3a] rounded-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[#0b2f3a] flex items-center justify-between">
          <h3 className="text-[15px] font-bold">Transactions</h3>
          <div className="flex bg-[#121f27] rounded-lg p-1 border border-[#0b2f3a]">
            {["all", "deposit", "withdrawal", "trade"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 text-[12px] font-bold rounded capitalize transition-colors ${
                  filter === f ? "bg-[#0b2f3a] text-[#d8f4f8]" : "text-gray-400 hover:text-white"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-[#121f27] shadow-md z-10 text-[12px] text-gray-400 uppercase font-semibold">
              <tr>
                <th className="px-6 py-3 border-b border-white/10">Date & Time</th>
                <th className="px-6 py-3 border-b border-white/10">Type</th>
                <th className="px-6 py-3 border-b border-white/10 w-[40%]">Description</th>
                <th className="px-6 py-3 border-b border-white/10 text-right">Amount</th>
                <th className="px-6 py-3 border-b border-white/10 text-right">Balance After</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.map(tx => (
                <tr key={tx.id} className="border-b border-[#0b2f3a] hover:bg-[#121f27] transition-colors group">
                  <td className="px-6 py-3 text-[13px] text-gray-300">
                    <div className="flex flex-col">
                      <span>{new Date(tx.date).toLocaleDateString()}</span>
                      <span className="text-[11px] text-gray-500">{new Date(tx.date).toLocaleTimeString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <TxIcon type={tx.type} />
                      <span className="text-[13px] text-gray-200 capitalize">{tx.type}</span>
                      {tx.status && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            tx.status === "approved"
                              ? "bg-green-500/10 text-green-400"
                              : tx.status === "pending"
                                ? "bg-orange-500/10 text-orange-300"
                                : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {tx.status}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-3 text-[13px] text-gray-300">{tx.description}</td>
                  <td className={`px-6 py-3 text-[14px] font-bold text-right ${
                    tx.status === "pending"
                      ? "text-orange-300"
                      : tx.status === "rejected"
                        ? "text-gray-400"
                        : tx.amount > 0
                          ? "text-green-500"
                          : tx.amount < 0
                            ? "text-red-500"
                            : "text-gray-300"
                  }`}>
                    {tx.amount > 0 ? "+" : tx.amount < 0 ? "-" : ""}{formatMoney(Math.abs(tx.amount))}
                  </td>
                  <td className="px-6 py-3 text-[14px] font-bold text-white text-right">
                    <div>{formatMoney(tx.balanceAfter)}</div>
                    {tx.status === "pending" && (
                      <div className="text-[11px] font-medium text-gray-500">No balance change yet</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredTransactions.length === 0 && (
            <div className="p-8 text-center text-gray-500 text-[14px]">
              No transactions found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, bg }: StatCardProps) => (
  <div className="bg-[#13232d] border border-[#0b2f3a] rounded-xl p-5 flex flex-col">
    <div className="flex items-center gap-3 mb-3">
      <div className={`w-8 h-8 rounded-full ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <span className="text-[12px] text-gray-400 font-semibold uppercase tracking-wider">{title}</span>
    </div>
    <span className="text-[22px] font-bold text-white tracking-tight leading-none">{value}</span>
  </div>
);

const TxIcon = ({ type }: { type: Transaction["type"] }) => {
  if (type === "deposit") return <ArrowDownRight className="w-4 h-4 text-green-500" />;
  if (type === "withdrawal") return <ArrowUpRight className="w-4 h-4 text-orange-500" />;
  if (type === "trade") return <ArrowRightLeft className="w-4 h-4 text-blue-500" />;
  return <DollarSign className="w-4 h-4 text-purple-500" />;
};
