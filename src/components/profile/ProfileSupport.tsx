import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Clock3,
  LifeBuoy,
  Loader2,
  LucideIcon,
  MessageSquare,
  Send,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type ProfileSupportProps = {
  mode?: "full" | "compact";
};

type SupportTab = "group" | "support" | "tickets";
type ChatMessageRow = Tables<"chat_messages">;
type SupportThreadRow = Tables<"support_threads">;
type SupportMessageRow = Tables<"support_messages">;
type SupportTicketRow = Tables<"support_tickets">;

const THREAD_STATUS_STYLES: Record<string, string> = {
  open: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  pending: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  resolved: "border-green-500/30 bg-green-500/10 text-green-300",
};

const TICKET_STATUS_STYLES: Record<string, string> = {
  open: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  pending: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  resolved: "border-green-500/30 bg-green-500/10 text-green-300",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "border-white/10 bg-white/5 text-gray-300",
  normal: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  high: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  urgent: "border-red-500/30 bg-red-500/10 text-red-300",
};

const TAB_OPTIONS: Array<{ id: SupportTab; label: string; icon: typeof MessageSquare }> = [
  { id: "group", label: "Traders", icon: MessageSquare },
  { id: "support", label: "Direct Desk", icon: LifeBuoy },
  { id: "tickets", label: "Tickets", icon: Ticket },
];

const formatTime = (value: string | null | undefined) => {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "-";
  return new Date(value).toLocaleString([], {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatStatusLabel = (value: string | null | undefined) => {
  if (!value) return "Unknown";
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const buildThreadSubject = (message: string, category: string) => {
  const trimmed = message.trim().replace(/\s+/g, " ");
  return `${category}: ${trimmed}`.slice(0, 72);
};

const EmptyState = ({
  action,
  description,
  icon: Icon,
  title,
}: {
  action?: ReactNode;
  description: string;
  icon: LucideIcon;
  title: string;
}) => (
  <div className="rounded-2xl border border-dashed border-white/10 bg-[#11161d] px-4 py-8 text-center">
    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white/5">
      <Icon className="h-5 w-5 text-gray-400" />
    </div>
    <h3 className="mt-4 text-sm font-bold text-white">{title}</h3>
    <p className="mt-2 text-xs leading-6 text-gray-400">{description}</p>
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);

export const ProfileSupport = ({ mode = "full" }: ProfileSupportProps) => {
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<SupportTab>("group");
  const [groupMessages, setGroupMessages] = useState<ChatMessageRow[]>([]);
  const [supportThread, setSupportThread] = useState<SupportThreadRow | null>(null);
  const [supportMessages, setSupportMessages] = useState<SupportMessageRow[]>([]);
  const [tickets, setTickets] = useState<SupportTicketRow[]>([]);
  const [groupInput, setGroupInput] = useState("");
  const [supportInput, setSupportInput] = useState("");
  const [supportCategory, setSupportCategory] = useState("General");
  const [ticketForm, setTicketForm] = useState({
    category: "General",
    subject: "",
    message: "",
    priority: "normal",
  });
  const [loadingGroup, setLoadingGroup] = useState(true);
  const [loadingSupport, setLoadingSupport] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(true);
  const [sendingGroup, setSendingGroup] = useState(false);
  const [sendingSupport, setSendingSupport] = useState(false);
  const [submittingTicket, setSubmittingTicket] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [supportError, setSupportError] = useState<string | null>(null);
  const [ticketError, setTicketError] = useState<string | null>(null);
  const groupEndRef = useRef<HTMLDivElement | null>(null);
  const supportEndRef = useRef<HTMLDivElement | null>(null);

  const tabs = useMemo(() => {
    return mode === "compact" ? TAB_OPTIONS.filter((tab) => tab.id !== "tickets") : TAB_OPTIONS;
  }, [mode]);

  const senderName =
    profile?.username?.trim() ||
    profile?.display_name?.trim() ||
    user?.email?.split("@")[0] ||
    "Trader";

  const loadGroupMessages = async () => {
    setLoadingGroup(true);
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) {
      setGroupError(error.message);
      setGroupMessages([]);
      setLoadingGroup(false);
      return;
    }

    setGroupError(null);
    setGroupMessages([...(data ?? [])].reverse());
    setLoadingGroup(false);
  };

  const loadSupportDesk = async () => {
    if (!user?.id) {
      setSupportThread(null);
      setSupportMessages([]);
      setLoadingSupport(false);
      return;
    }

    setLoadingSupport(true);
    const { data: thread, error: threadError } = await supabase
      .from("support_threads")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (threadError) {
      setSupportError(threadError.message);
      setSupportThread(null);
      setSupportMessages([]);
      setLoadingSupport(false);
      return;
    }

    setSupportThread(thread ?? null);

    if (!thread) {
      setSupportError(null);
      setSupportMessages([]);
      setLoadingSupport(false);
      return;
    }

    const { data: messages, error: messagesError } = await supabase
      .from("support_messages")
      .select("*")
      .eq("thread_id", thread.id)
      .order("created_at", { ascending: true });

    if (messagesError) {
      setSupportError(messagesError.message);
      setSupportMessages([]);
      setLoadingSupport(false);
      return;
    }

    setSupportError(null);
    setSupportMessages(messages ?? []);
    setLoadingSupport(false);
  };

  const loadTickets = async () => {
    if (!user?.id || mode === "compact") {
      setTickets([]);
      setLoadingTickets(false);
      return;
    }

    setLoadingTickets(true);
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      setTicketError(error.message);
      setTickets([]);
      setLoadingTickets(false);
      return;
    }

    setTicketError(null);
    setTickets(data ?? []);
    setLoadingTickets(false);
  };

  useEffect(() => {
    void loadGroupMessages();
    void loadSupportDesk();
    void loadTickets();
  }, [user?.id, mode]);

  useEffect(() => {
    groupEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupMessages, activeTab]);

  useEffect(() => {
    supportEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [supportMessages, activeTab]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`profile-support-${mode}-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => {
        void loadGroupMessages();
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_threads", filter: `user_id=eq.${user.id}` },
        () => {
          void loadSupportDesk();
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, () => {
        void loadSupportDesk();
      })
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets", filter: `user_id=eq.${user.id}` },
        () => {
          void loadTickets();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [mode, user?.id]);

  const handleSendGroupMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.id || !groupInput.trim()) return;

    setSendingGroup(true);
    const { error } = await supabase.from("chat_messages").insert({
      message: groupInput.trim(),
      sender_name: senderName,
      user_id: user.id,
    });
    setSendingGroup(false);

    if (error) {
      toast({
        title: "Message not sent",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setGroupInput("");
  };

  const handleSendSupportMessage = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.id || !supportInput.trim()) return;

    setSendingSupport(true);
    let nextThreadId = supportThread?.id ?? null;

    if (!nextThreadId) {
      const { data: createdThread, error: threadError } = await supabase
        .from("support_threads")
        .insert({
          assigned_role: "support_agent",
          category: supportCategory,
          subject: buildThreadSubject(supportInput, supportCategory),
          user_id: user.id,
        })
        .select("*")
        .single();

      if (threadError) {
        setSendingSupport(false);
        toast({
          title: "Chat desk unavailable",
          description: threadError.message,
          variant: "destructive",
        });
        return;
      }

      nextThreadId = createdThread.id;
      setSupportThread(createdThread);
    }

    const { error } = await supabase.from("support_messages").insert({
      message: supportInput.trim(),
      sender_id: user.id,
      sender_name: senderName,
      sender_role: "user",
      thread_id: nextThreadId,
    });
    setSendingSupport(false);

    if (error) {
      toast({
        title: "Support message failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setSupportInput("");
    setActiveTab("support");
    await loadSupportDesk();
  };

  const handleSubmitTicket = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.id) return;

    setSubmittingTicket(true);
    const { error } = await supabase.from("support_tickets").insert({
      category: ticketForm.category,
      message: ticketForm.message.trim(),
      priority: ticketForm.priority,
      subject: ticketForm.subject.trim(),
      user_id: user.id,
    });
    setSubmittingTicket(false);

    if (error) {
      toast({
        title: "Ticket not created",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Ticket submitted",
      description: "The desk will review it and update the status inside this panel.",
    });
    setTicketForm({
      category: "General",
      subject: "",
      message: "",
      priority: "normal",
    });
    await loadTickets();
  };

  return (
    <div className={`flex h-full flex-col text-white ${mode === "compact" ? "gap-3" : "gap-4"}`}>
      {mode === "full" ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Chat Center</h2>
              <p className="text-xs text-gray-400">Trade with the room, or message the desk when you need help.</p>
            </div>
            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-300">
              Live
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-[#11161d] p-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                isActive ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "group" ? (
        <div className="flex flex-1 flex-col rounded-2xl border border-white/5 bg-[#11161d]">
          <div className="flex items-center justify-between border-b border-white/5 px-4 py-3">
            <div>
              <h3 className="text-sm font-bold text-white">Traders Room</h3>
              <p className="text-[11px] text-gray-400">Fast ideas, market setups, and live chatter from the room.</p>
            </div>
            <div className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
              {Math.max(groupMessages.length, 1)} online
            </div>
          </div>

          <div className={`${mode === "compact" ? "max-h-[280px]" : "max-h-[360px]"} overflow-y-auto px-4 py-4`}>
            {loadingGroup ? (
              <div className="flex items-center justify-center py-10 text-sm text-gray-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading traders room...
              </div>
            ) : groupError ? (
              <EmptyState
                description={groupError}
                icon={AlertCircle}
                title="Chat room unavailable"
              />
            ) : groupMessages.length === 0 ? (
              <EmptyState
                description="Start the room with a market call or a quick setup note."
                icon={MessageSquare}
                title="No messages yet"
              />
            ) : (
              <div className="space-y-4">
                {groupMessages.map((message) => {
                  const isMe = message.user_id === user?.id;
                  const name = (message as Partial<ChatMessageRow>).sender_name || "Trader";

                  return (
                    <div key={message.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                      <div className="mb-1 flex items-center gap-2 px-1">
                        {!isMe ? <span className="text-[11px] font-semibold text-blue-300">{name}</span> : null}
                        <span className="text-[10px] text-gray-500">{formatTime(message.created_at)}</span>
                      </div>
                      <div
                        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-6 ${
                          isMe
                            ? "rounded-tr-sm bg-emerald-500 text-[#04150f]"
                            : "rounded-tl-sm border border-white/5 bg-[#151b24] text-gray-100"
                        }`}
                      >
                        {message.message}
                      </div>
                    </div>
                  );
                })}
                <div ref={groupEndRef} />
              </div>
            )}
          </div>

          <div className="border-t border-white/5 p-3">
            <form onSubmit={handleSendGroupMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={groupInput}
                onChange={(event) => setGroupInput(event.target.value)}
                placeholder="Share a setup or market insight..."
                className="flex-1 rounded-xl border border-white/10 bg-[#0b0e14] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={sendingGroup || !groupInput.trim()}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingGroup ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {activeTab === "support" ? (
        <div className="flex flex-1 flex-col rounded-2xl border border-white/5 bg-[#11161d]">
          <div className="border-b border-white/5 px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-500/15 text-blue-300">
                    <LifeBuoy className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Chat Desk</h3>
                    <p className="text-[11px] text-gray-400">Professional assistance for funding, KYC, and account issues.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-right">
                <div className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
                  <ShieldCheck className="h-3.5 w-3.5" /> Desk online
                </div>
                {supportThread ? (
                  <div
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                      THREAD_STATUS_STYLES[supportThread.status] ?? "border-white/10 bg-white/5 text-gray-300"
                    }`}
                  >
                    {formatStatusLabel(supportThread.status)}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-gray-400">
              <div className="rounded-xl border border-white/5 bg-[#0b0e14] px-3 py-2">
                <div className="text-gray-500">Category</div>
                <div className="mt-1 font-semibold text-white">{supportThread?.category || supportCategory}</div>
              </div>
              <div className="rounded-xl border border-white/5 bg-[#0b0e14] px-3 py-2">
                <div className="text-gray-500">Last activity</div>
                <div className="mt-1 font-semibold text-white">
                  {supportThread ? formatDateTime(supportThread.last_message_at) : "New conversation"}
                </div>
              </div>
            </div>
          </div>

          <div className={`${mode === "compact" ? "max-h-[260px]" : "max-h-[330px]"} overflow-y-auto px-4 py-4`}>
            {loadingSupport ? (
              <div className="flex items-center justify-center py-10 text-sm text-gray-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading support desk...
              </div>
            ) : supportError ? (
              <EmptyState
                description={supportError}
                icon={AlertCircle}
                title="Support chat unavailable"
              />
            ) : supportMessages.length === 0 ? (
              <EmptyState
                description="Start a direct conversation and the desk will keep the thread updated here."
                icon={LifeBuoy}
                title="No support conversation yet"
              />
            ) : (
              <div className="space-y-4">
                {supportMessages.map((message) => {
                  const isMe = message.sender_id === user?.id && message.sender_role === "user";
                  return (
                    <div key={message.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                      <div className="mb-1 flex items-center gap-2 px-1">
                        {!isMe ? (
                          <span className="text-[11px] font-semibold text-emerald-300">{message.sender_name || "Desk"}</span>
                        ) : null}
                        <span className="text-[10px] text-gray-500">{formatTime(message.created_at)}</span>
                      </div>
                      <div
                        className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-6 ${
                          isMe
                            ? "rounded-tr-sm bg-blue-600 text-white"
                            : "rounded-tl-sm border border-white/5 bg-[#151b24] text-gray-100"
                        }`}
                      >
                        {message.message}
                      </div>
                    </div>
                  );
                })}
                <div ref={supportEndRef} />
              </div>
            )}
          </div>

          <div className="space-y-3 border-t border-white/5 p-3">
            {!supportThread ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select
                  value={supportCategory}
                  onChange={(event) => setSupportCategory(event.target.value)}
                  className="rounded-xl border border-white/10 bg-[#0b0e14] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-blue-500"
                >
                  <option>General</option>
                  <option>Deposits & Withdrawals</option>
                  <option>Verification (KYC)</option>
                  <option>Trading Issue</option>
                  <option>Security</option>
                </select>
                <div className="flex items-center rounded-xl border border-white/5 bg-[#0b0e14] px-3 text-xs text-gray-400">
                  <Clock3 className="mr-2 h-4 w-4 text-blue-300" />
                  Average desk response: a few minutes
                </div>
              </div>
            ) : null}

            <form onSubmit={handleSendSupportMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={supportInput}
                onChange={(event) => setSupportInput(event.target.value)}
                placeholder="Describe the issue clearly so the desk can respond faster..."
                className="flex-1 rounded-xl border border-white/10 bg-[#0b0e14] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={sendingSupport || !supportInput.trim()}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-[#04150f] transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingSupport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {activeTab === "tickets" && mode !== "compact" ? (
        <div className="space-y-4 rounded-2xl border border-white/5 bg-[#11161d] p-4">
          <div>
            <h3 className="text-sm font-bold text-white">Open a Ticket</h3>
            <p className="mt-1 text-[11px] text-gray-400">Use tickets for detailed issues that need follow-up and status tracking.</p>
          </div>

          <form onSubmit={handleSubmitTicket} className="space-y-3">
            <select
              value={ticketForm.category}
              onChange={(event) => setTicketForm((current) => ({ ...current, category: event.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-[#0b0e14] px-3 py-3 text-sm text-white outline-none transition-colors focus:border-blue-500"
            >
              <option>General</option>
              <option>Deposits & Withdrawals</option>
              <option>Verification (KYC)</option>
              <option>Trading Issue</option>
              <option>Security</option>
            </select>

            <input
              required
              type="text"
              value={ticketForm.subject}
              onChange={(event) => setTicketForm((current) => ({ ...current, subject: event.target.value }))}
              placeholder="Short subject"
              className="w-full rounded-xl border border-white/10 bg-[#0b0e14] px-3 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-blue-500"
            />

            <select
              value={ticketForm.priority}
              onChange={(event) => setTicketForm((current) => ({ ...current, priority: event.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-[#0b0e14] px-3 py-3 text-sm text-white outline-none transition-colors focus:border-blue-500"
            >
              <option value="low">Low priority</option>
              <option value="normal">Normal priority</option>
              <option value="high">High priority</option>
              <option value="urgent">Urgent</option>
            </select>

            <textarea
              required
              rows={5}
              value={ticketForm.message}
              onChange={(event) => setTicketForm((current) => ({ ...current, message: event.target.value }))}
              placeholder="Explain the issue with as much useful detail as possible..."
              className="w-full resize-none rounded-xl border border-white/10 bg-[#0b0e14] px-3 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-blue-500"
            />

            <button
              type="submit"
              disabled={submittingTicket}
              className="inline-flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submittingTicket ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ticket className="mr-2 h-4 w-4" />}
              Submit Ticket
            </button>
          </form>

          <div className="space-y-3 border-t border-white/5 pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Your Tickets</h4>
              <span className="text-[11px] text-gray-500">{tickets.length} total</span>
            </div>

            {loadingTickets ? (
              <div className="flex items-center justify-center py-8 text-sm text-gray-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading tickets...
              </div>
            ) : ticketError ? (
              <EmptyState description={ticketError} icon={AlertCircle} title="Tickets unavailable" />
            ) : tickets.length === 0 ? (
              <EmptyState
                description="Your submitted issues will appear here with status updates from the desk."
                icon={Ticket}
                title="No tickets yet"
              />
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div key={ticket.id} className="rounded-2xl border border-white/5 bg-[#0b0e14] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h5 className="truncate text-sm font-semibold text-white">{ticket.subject}</h5>
                        <p className="mt-1 text-[11px] text-gray-400">
                          {ticket.category} • Opened {formatDateTime(ticket.created_at)}
                        </p>
                      </div>
                      <div className="space-y-2 text-right">
                        <div
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                            TICKET_STATUS_STYLES[ticket.status] ?? "border-white/10 bg-white/5 text-gray-300"
                          }`}
                        >
                          {formatStatusLabel(ticket.status)}
                        </div>
                        <div
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                            PRIORITY_STYLES[ticket.priority] ?? "border-white/10 bg-white/5 text-gray-300"
                          }`}
                        >
                          {ticket.priority}
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-gray-200">{ticket.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
