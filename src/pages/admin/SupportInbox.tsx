import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  LifeBuoy,
  Loader2,
  LucideIcon,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Ticket,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStaffAccess } from "@/hooks/useStaffAccess";
import { toast } from "@/hooks/use-toast";
import { getRoleLabel } from "@/lib/adminRoles";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

type SupportInboxTab = "live" | "tickets";
type ProfileBrief = Pick<Tables<"profiles">, "avatar_url" | "display_name" | "id" | "username">;
type SupportThreadRow = Tables<"support_threads">;
type SupportMessageRow = Tables<"support_messages">;
type SupportTicketRow = Tables<"support_tickets">;

type ThreadWithUser = SupportThreadRow & {
  userHandle: string;
  userName: string;
};

type TicketWithUser = SupportTicketRow & {
  userHandle: string;
  userName: string;
};

const THREAD_STATUS_STYLES: Record<string, string> = {
  open: "border-blue-500/30 bg-blue-500/10 text-blue-300",
  pending: "border-orange-500/30 bg-orange-500/10 text-orange-300",
  resolved: "border-green-500/30 bg-green-500/10 text-green-300",
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

const formatStatusLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

const getUserName = (profile: ProfileBrief | undefined, userId: string) =>
  profile?.display_name || profile?.username || `User ${userId.slice(0, 8).toUpperCase()}`;

const getUserHandle = (profile: ProfileBrief | undefined, userId: string) =>
  profile?.username || userId.slice(0, 8).toUpperCase();

const EmptyState = ({
  description,
  icon: Icon,
  title,
}: {
  description: string;
  icon: LucideIcon;
  title: string;
}) => (
  <div className="rounded-2xl border border-white/5 bg-[#11161d] p-8 text-center shadow-lg">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
      <Icon className="h-5 w-5 text-gray-400" />
    </div>
    <h3 className="mt-4 text-lg font-bold text-white">{title}</h3>
    <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-400">{description}</p>
  </div>
);

const SupportInbox = () => {
  const { profile, user } = useAuth();
  const { primaryRole } = useStaffAccess();
  const [activeTab, setActiveTab] = useState<SupportInboxTab>("live");
  const [searchTerm, setSearchTerm] = useState("");
  const [threads, setThreads] = useState<ThreadWithUser[]>([]);
  const [tickets, setTickets] = useState<TicketWithUser[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessageRow[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sendingReply, setSendingReply] = useState(false);
  const [updatingThreadStatus, setUpdatingThreadStatus] = useState<string | null>(null);
  const [updatingTicketStatus, setUpdatingTicketStatus] = useState<string | null>(null);

  const loadInbox = async () => {
    setLoading(true);
    const [threadsResult, ticketsResult, profilesResult] = await Promise.all([
      supabase.from("support_threads").select("*").order("last_message_at", { ascending: false }),
      supabase.from("support_tickets").select("*").order("created_at", { ascending: false }),
      supabase.from("profiles").select("id, username, display_name, avatar_url"),
    ]);

    if (threadsResult.error) {
      toast({
        title: "Support inbox unavailable",
        description: threadsResult.error.message,
        variant: "destructive",
      });
      setThreads([]);
      setTickets([]);
      setLoading(false);
      return;
    }

    if (ticketsResult.error) {
      toast({
        title: "Tickets unavailable",
        description: ticketsResult.error.message,
        variant: "destructive",
      });
      setTickets([]);
    }

    if (profilesResult.error) {
      toast({
        title: "Profiles unavailable",
        description: profilesResult.error.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const profilesById = new Map<string, ProfileBrief>((profilesResult.data ?? []).map((row) => [row.id, row]));

    const nextThreads = (threadsResult.data ?? []).map((thread) => {
      const userProfile = profilesById.get(thread.user_id);
      return {
        ...thread,
        userHandle: getUserHandle(userProfile, thread.user_id),
        userName: getUserName(userProfile, thread.user_id),
      };
    });

    const nextTickets = (ticketsResult.data ?? []).map((ticket) => {
      const userProfile = profilesById.get(ticket.user_id);
      return {
        ...ticket,
        userHandle: getUserHandle(userProfile, ticket.user_id),
        userName: getUserName(userProfile, ticket.user_id),
      };
    });

    setThreads(nextThreads);
    setTickets(nextTickets);
    setSelectedThreadId((current) => (current && nextThreads.some((thread) => thread.id === current) ? current : nextThreads[0]?.id ?? null));
    setLoading(false);
  };

  const loadMessages = async (threadId: string | null) => {
    if (!threadId) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);
    const { data, error } = await supabase
      .from("support_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (error) {
      toast({
        title: "Messages unavailable",
        description: error.message,
        variant: "destructive",
      });
      setMessages([]);
      setMessagesLoading(false);
      return;
    }

    setMessages(data ?? []);
    setMessagesLoading(false);
  };

  useEffect(() => {
    void loadInbox();
  }, []);

  useEffect(() => {
    void loadMessages(selectedThreadId);
  }, [selectedThreadId]);

  useEffect(() => {
    const channel = supabase
      .channel("admin-support-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_threads" }, () => {
        void loadInbox();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, () => {
        void loadMessages(selectedThreadId);
        void loadInbox();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => {
        void loadInbox();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [selectedThreadId]);

  const filteredThreads = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return threads;

    return threads.filter((thread) =>
      [thread.userName, thread.userHandle, thread.subject, thread.category, thread.status]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [searchTerm, threads]);

  const filteredTickets = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    if (!search) return tickets;

    return tickets.filter((ticket) =>
      [ticket.userName, ticket.userHandle, ticket.subject, ticket.category, ticket.status, ticket.priority]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search)),
    );
  }, [searchTerm, tickets]);

  const selectedThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [selectedThreadId, threads],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInbox();
    await loadMessages(selectedThreadId);
    setRefreshing(false);
  };

  const handleSendReply = async (event: FormEvent) => {
    event.preventDefault();
    if (!user?.id || !selectedThreadId || !reply.trim()) return;

    setSendingReply(true);
    const displayName = profile?.display_name?.trim() || profile?.username?.trim() || getRoleLabel(primaryRole);

    const { error: updateError } = await supabase
      .from("support_threads")
      .update({
        assigned_role: primaryRole ?? "support_agent",
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedThreadId);

    if (updateError) {
      setSendingReply(false);
      toast({
        title: "Reply not sent",
        description: updateError.message,
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("support_messages").insert({
      message: reply.trim(),
      sender_id: user.id,
      sender_name: displayName,
      sender_role: "staff",
      thread_id: selectedThreadId,
    });
    setSendingReply(false);

    if (error) {
      toast({
        title: "Reply not sent",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setReply("");
    await loadMessages(selectedThreadId);
    await loadInbox();
  };

  const handleThreadStatus = async (threadId: string, status: "open" | "pending" | "resolved") => {
    setUpdatingThreadStatus(threadId);
    const { error } = await supabase
      .from("support_threads")
      .update({
        assigned_role: primaryRole ?? "support_agent",
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId);
    setUpdatingThreadStatus(null);

    if (error) {
      toast({
        title: "Status update failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    await loadInbox();
  };

  const handleTicketStatus = async (ticketId: string, status: "open" | "pending" | "resolved") => {
    setUpdatingTicketStatus(ticketId);
    const { error } = await supabase
      .from("support_tickets")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);
    setUpdatingTicketStatus(null);

    if (error) {
      toast({
        title: "Ticket update failed",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    await loadInbox();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Support Inbox</h2>
          <p className="mt-1 text-sm text-gray-400">
            Run the live chat desk professionally, keep conversations organized, and track ticket follow-up.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-[#1A1F26] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:opacity-60"
        >
          <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/5 bg-[#11161d] p-4 shadow-lg">
        <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider text-blue-300">Your Desk Role</div>
          <div className="mt-1 text-sm font-bold text-white">{getRoleLabel(primaryRole)}</div>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#0b0e14] px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider text-gray-500">Open Threads</div>
          <div className="mt-1 text-sm font-bold text-white">{threads.filter((thread) => thread.status !== "resolved").length}</div>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#0b0e14] px-4 py-3">
          <div className="text-[11px] uppercase tracking-wider text-gray-500">Pending Tickets</div>
          <div className="mt-1 text-sm font-bold text-white">{tickets.filter((ticket) => ticket.status !== "resolved").length}</div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-white/5 bg-[#11161d] p-1 w-fit">
        <button
          onClick={() => setActiveTab("live")}
          className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold transition-colors ${
            activeTab === "live" ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
          }`}
        >
          <LifeBuoy size={16} /> Live Chat
        </button>
        <button
          onClick={() => setActiveTab("tickets")}
          className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-bold transition-colors ${
            activeTab === "tickets" ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-white"
          }`}
        >
          <Ticket size={16} /> Tickets
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder={activeTab === "live" ? "Search threads by trader, subject, or status..." : "Search tickets..."}
          className="w-full rounded-xl border border-white/10 bg-[#11161d] py-3 pl-10 pr-4 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-blue-500"
        />
      </div>

      {loading ? (
        <EmptyState
          description="Loading live support threads and ticket status..."
          icon={Loader2}
          title="Preparing inbox"
        />
      ) : activeTab === "live" ? (
        filteredThreads.length === 0 ? (
          <EmptyState
            description="When traders open a direct desk conversation, it will appear here in real time."
            icon={MessageSquare}
            title="No live chat threads yet"
          />
        ) : (
          <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
            <div className="rounded-2xl border border-white/5 bg-[#11161d] shadow-lg">
              <div className="border-b border-white/5 px-4 py-3">
                <h3 className="text-sm font-bold text-white">Active Conversations</h3>
                <p className="mt-1 text-xs text-gray-400">Pick a trader thread to continue the conversation.</p>
              </div>
              <div className="max-h-[720px] overflow-y-auto">
                {filteredThreads.map((thread) => {
                  const isActive = thread.id === selectedThreadId;
                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => setSelectedThreadId(thread.id)}
                      className={`w-full border-b border-white/5 px-4 py-4 text-left transition-colors ${
                        isActive ? "bg-blue-600/10" : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-white">{thread.userName}</div>
                          <div className="mt-1 text-xs text-gray-500">@{thread.userHandle}</div>
                        </div>
                        <div
                          className={`rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                            THREAD_STATUS_STYLES[thread.status] ?? "border-white/10 bg-white/5 text-gray-300"
                          }`}
                        >
                          {thread.status}
                        </div>
                      </div>
                      <div className="mt-3 text-sm font-medium text-gray-100">{thread.subject}</div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                        <span>{thread.category}</span>
                        <span>{formatDateTime(thread.last_message_at)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#11161d] shadow-lg">
              {selectedThread ? (
                <>
                  <div className="border-b border-white/5 px-5 py-4">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white">{selectedThread.userName}</h3>
                          <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-gray-300">
                            @{selectedThread.userHandle}
                          </div>
                        </div>
                        <p className="mt-2 text-sm text-gray-400">{selectedThread.subject}</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          <span>{selectedThread.category}</span>
                          <span>•</span>
                          <span>Updated {formatDateTime(selectedThread.last_message_at)}</span>
                          <span>•</span>
                          <span>Assigned {getRoleLabel(selectedThread.assigned_role ?? primaryRole)}</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {(["open", "pending", "resolved"] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            disabled={updatingThreadStatus === selectedThread.id}
                            onClick={() => void handleThreadStatus(selectedThread.id, status)}
                            className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                              selectedThread.status === status
                                ? THREAD_STATUS_STYLES[status]
                                : "border-white/10 bg-[#0b0e14] text-gray-300 hover:bg-white/5"
                            }`}
                          >
                            {updatingThreadStatus === selectedThread.id ? "Saving..." : formatStatusLabel(status)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="max-h-[480px] overflow-y-auto px-5 py-5">
                    {messagesLoading ? (
                      <div className="flex items-center justify-center py-10 text-sm text-gray-400">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading conversation...
                      </div>
                    ) : messages.length === 0 ? (
                      <EmptyState
                        description="Once the trader or desk sends a message, the full conversation will appear here."
                        icon={MessageSquare}
                        title="No messages in this thread yet"
                      />
                    ) : (
                      <div className="space-y-4">
                        {messages.map((message) => {
                          const isStaff = message.sender_role !== "user";
                          return (
                            <div key={message.id} className={`flex ${isStaff ? "justify-end" : "justify-start"}`}>
                              <div
                                className={`max-w-[78%] rounded-2xl px-4 py-3 ${
                                  isStaff
                                    ? "rounded-br-sm bg-blue-600 text-white"
                                    : "rounded-bl-sm border border-white/5 bg-[#0b0e14] text-gray-100"
                                }`}
                              >
                                <div className="mb-1 flex items-center gap-2 text-[11px]">
                                  <span className={isStaff ? "font-semibold text-blue-100" : "font-semibold text-emerald-300"}>
                                    {message.sender_name}
                                  </span>
                                  <span className={isStaff ? "text-blue-100/70" : "text-gray-500"}>
                                    {formatDateTime(message.created_at)}
                                  </span>
                                </div>
                                <p className="text-sm leading-6">{message.message}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-white/5 p-4">
                    <form onSubmit={handleSendReply} className="flex items-center gap-3">
                      <input
                        type="text"
                        value={reply}
                        onChange={(event) => setReply(event.target.value)}
                        placeholder="Reply professionally and clearly..."
                        className="flex-1 rounded-xl border border-white/10 bg-[#0b0e14] px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-blue-500"
                      />
                      <button
                        type="submit"
                        disabled={sendingReply || !reply.trim()}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-[#04150f] transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {sendingReply ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <EmptyState
                  description="Select a conversation from the left to start replying."
                  icon={LifeBuoy}
                  title="No thread selected"
                />
              )}
            </div>
          </div>
        )
      ) : filteredTickets.length === 0 ? (
        <EmptyState
          description="Detailed support tickets will appear here when users submit them."
          icon={Ticket}
          title="No tickets yet"
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredTickets.map((ticket) => (
            <div key={ticket.id} className="rounded-2xl border border-white/5 bg-[#11161d] p-5 shadow-lg">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate text-lg font-bold text-white">{ticket.subject}</h3>
                    <div
                      className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                        THREAD_STATUS_STYLES[ticket.status] ?? "border-white/10 bg-white/5 text-gray-300"
                      }`}
                    >
                      {ticket.status}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-gray-400">
                    {ticket.userName} • @{ticket.userHandle}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {ticket.category} • {ticket.priority} priority • Opened {formatDateTime(ticket.created_at)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {(["open", "pending", "resolved"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      disabled={updatingTicketStatus === ticket.id}
                      onClick={() => void handleTicketStatus(ticket.id, status)}
                      className={`rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                        ticket.status === status
                          ? THREAD_STATUS_STYLES[status]
                          : "border-white/10 bg-[#0b0e14] text-gray-300 hover:bg-white/5"
                      }`}
                    >
                      {updatingTicketStatus === ticket.id ? "Saving..." : formatStatusLabel(status)}
                    </button>
                  ))}
                </div>
              </div>

              <p className="mt-4 text-sm leading-7 text-gray-100">{ticket.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SupportInbox;
