import { supabase } from "@/integrations/supabase/client";

const supabaseAny = supabase as any;

export type TradeBalanceAuditEntry = {
  id: string;
  user_id: string;
  trade_id: string;
  event_type: "trade_open" | "trade_close";
  account_scope: "live" | "tournament";
  asset_symbol: string;
  direction: string;
  status: string | null;
  amount: number;
  payout_rate: number;
  profit: number | null;
  change_amount: number;
  balance_before: number;
  balance_after: number;
  available_balance_before: number;
  available_balance_after: number;
  reserved_withdrawal_balance: number;
  context: Record<string, unknown>;
  created_at: string;
};

export type InsertTradeBalanceAuditInput = Omit<TradeBalanceAuditEntry, "id" | "created_at" | "context"> & {
  context?: Record<string, unknown>;
};

const sanitizeMoney = (value: number) => Math.round((Number(value) || 0) * 100) / 100;

export const isMissingTradeBalanceAuditTableError = (error: { message?: string | null; code?: string | null } | null | undefined) => {
  const message = String(error?.message ?? "").toLowerCase();
  return message.includes("trade_balance_audit_logs") && (
    message.includes("does not exist") ||
    message.includes("not found") ||
    message.includes("could not find")
  );
};

export const insertTradeBalanceAudit = async (entry: InsertTradeBalanceAuditInput) => {
  const payload = {
    ...entry,
    amount: sanitizeMoney(entry.amount),
    payout_rate: sanitizeMoney(entry.payout_rate),
    profit: entry.profit == null ? null : sanitizeMoney(entry.profit),
    change_amount: sanitizeMoney(entry.change_amount),
    balance_before: sanitizeMoney(entry.balance_before),
    balance_after: sanitizeMoney(entry.balance_after),
    available_balance_before: sanitizeMoney(entry.available_balance_before),
    available_balance_after: sanitizeMoney(entry.available_balance_after),
    reserved_withdrawal_balance: sanitizeMoney(entry.reserved_withdrawal_balance),
    context: entry.context ?? {},
  };

  const response = await supabaseAny.from("trade_balance_audit_logs").insert(payload);

  if (response.error && !isMissingTradeBalanceAuditTableError(response.error)) {
    console.error("Failed to insert trade balance audit log", response.error);
  }

  return response;
};

export const fetchTradeBalanceAuditEntries = async (tradeId: string) => {
  const response = await supabaseAny
    .from("trade_balance_audit_logs")
    .select("*")
    .eq("trade_id", tradeId)
    .order("created_at", { ascending: true });

  if (response.error && !isMissingTradeBalanceAuditTableError(response.error)) {
    console.error("Failed to fetch trade balance audit logs", response.error);
  }

  return (response.data ?? []) as TradeBalanceAuditEntry[];
};
