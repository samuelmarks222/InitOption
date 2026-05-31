import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, ArrowRightLeft, DollarSign, Info } from "lucide-react";
import { useStatistics, Transaction } from "@/hooks/useStatistics";
import { useCurrency } from "@/contexts/CurrencyContext";

const STATUS_BADGE_STYLES: Record<string, string> = {
  approved: "bg-green-500/10 text-green-400",
  completed: "bg-green-500/10 text-green-400",
  failed: "bg-red-500/10 text-red-400",
  pending: "bg-[#0fa053]/10 text-[#8be0af]",
  processing: "bg-[#0fa053]/10 text-[#8be0af]",
  rejected: "bg-red-500/10 text-red-400",
};

const getStatusBadgeClass = (status?: Transaction["status"]) =>
  status ? STATUS_BADGE_STYLES[status] ?? "bg-white/10 text-gray-300" : "";

const getAmountClass = (tx: Transaction) => {
  if (tx.status === "pending" || tx.status === "approved" || tx.status === "processing") {
    return "text-[#7ee3a9]";
  }

  if (tx.status === "rejected" || tx.status === "failed") {
    return "text-[#ff7b7b]";
  }

  if (tx.amount > 0) {
    return "text-[#35d07f]";
  }

  if (tx.amount < 0) {
    return "text-[#ff6f6f]";
  }

  return "text-gray-300";
};

const resolveStatusLabel = (status?: Transaction["status"]) => {
  if (!status) return "Completed";
  if (status === "pending" || status === "approved" || status === "processing") return "Processing";
  if (status === "failed" || status === "rejected") return "Failed";
  return "Completed";
};

const resolveStatusTone = (status?: Transaction["status"]) => {
  if (!status) return "text-emerald-300";
  if (status === "pending" || status === "approved" || status === "processing") return "text-yellow-300";
  if (status === "failed" || status === "rejected") return "text-red-400";
  return "text-emerald-300";
};

const resolvePaymentSystem = (tx: Transaction) => {
  const desc = String(tx.description ?? "").toLowerCase();
  if (desc.includes("m-pesa") || desc.includes("mpesa")) return "M-pesa";
  if (desc.includes("usdt") && desc.includes("polygon")) return "USDT (Polygon)";
  if (desc.includes("usdt")) return "USDT (BEP-20)";
  if (desc.includes("ethereum") || desc.includes("eth")) return "Ethereum (ETH)";
  if (desc.includes("binance")) return "Binance Pay";
  if (tx.type === "withdrawal") return "M-pesa";
  if (tx.type === "deposit") return "M-pesa";
  return "Card / Bank";
};

const resolveTransactionType = (tx: Transaction) => {
  if (tx.type === "deposit") return "Deposit";
  if (tx.type === "withdrawal") return "Withdrawal";
  if (tx.type === "trade") return "Trade";
  return "Transfer";
};

const resolveStatusNote = (status?: Transaction["status"]) => {
  if (status === "pending" || status === "approved" || status === "processing") {
    return "Please note that payments with this method could take up to 24 hours to process. If it is not on your balance by that time, please contact support.";
  }
  if (status === "failed" || status === "rejected") {
    return "This transaction did not complete. If you need help, please contact support.";
  }
  return "This transaction is completed and already reflected on your balance.";
};

const TxIcon = ({ type }: { type: Transaction["type"] }) => {
  if (type === "deposit") return <ArrowDownRight className="h-4 w-4 text-[#35d07f]" />;
  if (type === "withdrawal") return <ArrowUpRight className="h-4 w-4 text-[#0fa053]" />;
  if (type === "trade") return <ArrowRightLeft className="h-4 w-4 text-[#0fa053]" />;
  return <DollarSign className="h-4 w-4 text-[#1e2330]" />;
};

export const ProfileBalanceHistory = () => {
  const { transactions } = useStatistics();
  const [filter, setFilter] = useState<"all" | "deposit" | "withdrawal">("all");
  const { formatMoney } = useCurrency();

  const filteredTransactions = useMemo(
    () => transactions.filter((tx) => filter === "all" || tx.type === filter),
    [transactions, filter],
  );

  return (
    <div className="flex h-full min-w-0 max-w-6xl flex-col text-white">
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex flex-wrap gap-2 rounded-[14px] border border-[#2a3142] bg-[#202736] p-2">
          {[
            { id: "all", label: "Transactions" },
            { id: "deposit", label: "Deposits" },
            { id: "withdrawal", label: "Withdrawals" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id as "all" | "deposit" | "withdrawal")}
              className={`rounded-[10px] px-3 py-2 text-[12px] font-semibold transition-colors sm:px-4 sm:text-[13px] ${
                filter === item.id ? "bg-[#2f374b] text-white" : "text-[#c2cadd] hover:bg-[#2a3142]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 md:ml-auto">
          <button
            type="button"
            className="rounded-[12px] border border-[#2a3142] bg-[#202736] px-3 py-2 text-[12px] font-semibold text-[#a6b1c8] sm:px-4 sm:text-[13px]"
          >
            Prev
          </button>
          <div className="rounded-[12px] border border-[#2a3142] bg-[#202736] px-3 py-2 text-[12px] font-semibold text-white sm:px-4 sm:text-[13px]">
            1/1
          </div>
          <button
            type="button"
            className="rounded-[12px] border border-[#2a3142] bg-[#202736] px-3 py-2 text-[12px] font-semibold text-[#a6b1c8] sm:px-4 sm:text-[13px]"
          >
            Next
          </button>
        </div>
      </div>

      <div className="flex-1 rounded-[18px] border border-[#283142] bg-[#1d2433] shadow-[0_20px_60px_rgba(7,11,20,0.35)]">
        <div className="hidden grid-cols-[1.1fr_1.2fr_1fr_1.2fr_1.2fr_1fr] gap-0 border-b border-[#2a3142] px-6 py-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#9aa6bf] md:grid">
          <span>Transaction ID</span>
          <span>Date and time</span>
          <span>Status</span>
          <span>Transaction type</span>
          <span>Payment system</span>
          <span className="text-right">Amount</span>
        </div>
        <div className="divide-y divide-[#243047]">
          {filteredTransactions.length === 0 && (
            <div className="p-8 text-center text-[#92a0bd]">No transactions found.</div>
          )}
          <div className="md:hidden">
            {filteredTransactions.map((tx) => {
              const statusLabel = resolveStatusLabel(tx.status);
              const paymentSystem = resolvePaymentSystem(tx);
              const transactionType = resolveTransactionType(tx);
              const statusTone = resolveStatusTone(tx.status);

              return (
                <div key={tx.id} className="space-y-2 px-4 py-4 text-[13px] text-[#d9e2f1]">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{String(tx.id ?? "").match(/\d+/)?.[0]?.padStart(9, "0") || "—"}</span>
                    <span className={`text-right text-[14px] font-bold ${getAmountClass(tx)}`}>
                      {tx.amount > 0 ? "+" : tx.amount < 0 ? "-" : ""}{formatMoney(Math.abs(tx.amount))}
                    </span>
                  </div>
                  <div className="text-[12px] text-[#c0cadd]">
                    {new Date(tx.date).toLocaleDateString("en-GB")}, {new Date(tx.date).toLocaleTimeString("en-GB")}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-2.5 w-2.5 rounded-full ${statusTone}`} />
                    <span className="text-[13px] font-semibold text-white">{statusLabel}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-[12px] text-[#c7d1e6]">
                    <span>{transactionType}</span>
                    <span>•</span>
                    <span>{paymentSystem}</span>
                  </div>
                </div>
              );
            })}
          </div>
          {filteredTransactions.map((tx) => {
            const statusLabel = resolveStatusLabel(tx.status);
            const paymentSystem = resolvePaymentSystem(tx);
            const transactionType = resolveTransactionType(tx);
            const statusTone = resolveStatusTone(tx.status);

            return (
              <div key={tx.id} className="hidden grid-cols-[1.1fr_1.2fr_1fr_1.2fr_1.2fr_1fr] items-center px-6 py-4 text-[14px] text-[#d9e2f1] md:grid">
                <span className="font-semibold">{String(tx.id ?? "").match(/\d+/)?.[0]?.padStart(9, "0") || "—"}</span>
                <div className="text-[13px] text-[#c0cadd]">
                  {new Date(tx.date).toLocaleDateString("en-GB")}, {new Date(tx.date).toLocaleTimeString("en-GB")}
                </div>
                <div className="relative flex items-center gap-2">
                  <span className={`inline-flex h-2.5 w-2.5 rounded-full ${statusTone}`} />
                  <span className="text-[13px] font-semibold text-white">{statusLabel}</span>
                  <div className="group relative">
                    <Info className="h-4 w-4 text-[#8693af]" />
                    <div className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 w-72 -translate-x-1/2 rounded-[12px] border border-[#2a3142] bg-[#141a27] p-3 text-[12px] text-[#cbd6eb] opacity-0 shadow-[0_16px_40px_rgba(0,0,0,0.35)] transition group-hover:opacity-100">
                      {resolveStatusNote(tx.status)}
                    </div>
                  </div>
                </div>
                <span className="text-[13px] font-semibold text-white">{transactionType}</span>
                <span className="text-[13px] text-[#c7d1e6]">{paymentSystem}</span>
                <span className={`text-right text-[14px] font-bold ${getAmountClass(tx)}`}>
                  {tx.amount > 0 ? "+" : tx.amount < 0 ? "-" : ""}{formatMoney(Math.abs(tx.amount))}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
