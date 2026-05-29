import { FormEvent, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  Bell,
  ChevronLeft,
  Clock3,
  LifeBuoy,
  Loader2,
  LucideIcon,
  MessageSquare,
  PencilLine,
  Search,
  Send,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { VipBadge } from "@/components/vip/VipBadge";

type ProfileSupportProps = {
  mode?: "full" | "compact" | "community" | "desk";
};

type SupportTab = "group" | "support" | "tickets";
type ChatMessageRow = Tables<"chat_messages">;
type GroupChatMessageRow = ChatMessageRow & {
  profiles?: {
    avatar_url: string | null;
    username: string | null;
    vip_tier: string | null;
  } | null;
};
type CompactInboxRow = {
  avatarLabel?: string;
  avatarUrl?: string | null;
  icon?: LucideIcon;
  id: string;
  preview: string;
  tab: "group" | "support";
  time: string;
  title: string;
  unread: number;
};
type SupportThreadRow = Tables<"support_threads">;
type SupportMessageRow = Tables<"support_messages">;
type SupportTicketRow = Tables<"support_tickets">;

const THREAD_STATUS_STYLES: Record<string, string> = {
  open: "border-[#0fa053]/30 bg-[#0fa053]/10 text-[#8be0af]",
  pending: "border-[#0fa053]/30 bg-[#0fa053]/10 text-[#8be0af]",
  resolved: "border-[#0fa053]/30 bg-green-500/10 text-green-300",
};

const TICKET_STATUS_STYLES: Record<string, string> = {
  open: "border-[#0fa053]/30 bg-[#0fa053]/10 text-[#8be0af]",
  pending: "border-[#0fa053]/30 bg-[#0fa053]/10 text-[#8be0af]",
  resolved: "border-[#0fa053]/30 bg-green-500/10 text-green-300",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "border-white/10 bg-white/5 text-gray-300",
  normal: "border-[#0fa053]/30 bg-[#0fa053]/10 text-[#8be0af]",
  high: "border-[#0fa053]/30 bg-[#0fa053]/10 text-[#8be0af]",
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

const formatInboxTime = (value: string | null | undefined) => {
  if (!value) return "--:--";
  const date = new Date(value);
  const now = new Date();
  const isSameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isSameDay) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString([], { day: "2-digit", month: "short" });
};

const toInitials = (value: string) => {
  const clean = value.trim();
  if (!clean) return "TR";
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
};

const trimPreview = (value: string, maxLength = 64) => {
  const normalized = value.trim().replace(/\s+/g, " ");
  if (!normalized) return "New message";
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
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

const ChatAvatar = ({
  alt,
  className = "",
  icon: Icon,
  label,
  src,
}: {
  alt: string;
  className?: string;
  icon?: LucideIcon;
  label?: string;
  src?: string | null;
}) => (
  <div className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#2a2f3a] text-[11px] font-bold text-[#dce6f7] ${className}`}>
    {src ? (
      <img src={src} alt={alt} className="h-full w-full object-cover" />
    ) : Icon ? (
      <Icon className="h-4 w-4" />
    ) : (
      <span>{label || toInitials(alt)}</span>
    )}
  </div>
);

export const ProfileSupport = ({ mode = "full" }: ProfileSupportProps) => {
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<SupportTab>("group");
  const [groupMessages, setGroupMessages] = useState<GroupChatMessageRow[]>([]);
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
  const [chatSearch, setChatSearch] = useState("");
  const [compactChatOpen, setCompactChatOpen] = useState(false);
  const groupEndRef = useRef<HTMLDivElement | null>(null);
  const supportEndRef = useRef<HTMLDivElement | null>(null);
  const isCompact = mode === "compact";
  const isCommunity = mode === "community";
  const isDesk = mode === "desk";
  const roomCount = Math.max(groupMessages.length, 1);

  const tabs = useMemo(() => {
    if (isCommunity) {
      return TAB_OPTIONS.filter((tab) => tab.id === "group");
    }

    if (isDesk) {
      return TAB_OPTIONS.filter((tab) => tab.id === "support");
    }

    return isCompact ? TAB_OPTIONS.filter((tab) => tab.id !== "tickets") : TAB_OPTIONS;
  }, [isCompact, isCommunity, isDesk]);

  const senderName =
    profile?.username?.trim() ||
    profile?.display_name?.trim() ||
    user?.email?.split("@")[0] ||
    "Trader";

  const loadGroupMessages = async () => {
    if (isDesk) {
      setGroupMessages([]);
      setLoadingGroup(false);
      return;
    }

    setLoadingGroup(true);
    const { data, error } = await supabase
      .from("chat_messages")
      .select("*, profiles(username, avatar_url, vip_tier)")
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) {
      setGroupError(error.message);
      setGroupMessages([]);
      setLoadingGroup(false);
      return;
    }

    setGroupError(null);
    setGroupMessages(([...(data ?? [])] as GroupChatMessageRow[]).reverse());
    setLoadingGroup(false);
  };

  const loadSupportDesk = async () => {
    if (!user?.id || isCommunity) {
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
    if (!user?.id || isCompact || isCommunity || isDesk) {
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
    if (!isDesk) {
      void loadGroupMessages();
    }
    if (!isCommunity) {
      void loadSupportDesk();
    }
    if (!isCompact && !isCommunity && !isDesk) {
      void loadTickets();
    }
  }, [user?.id, mode, isCompact, isCommunity, isDesk]);

  useEffect(() => {
    if (isCommunity && activeTab !== "group") {
      setActiveTab("group");
    }

    if (isDesk && activeTab !== "support") {
      setActiveTab("support");
    }
  }, [activeTab, isCommunity, isDesk]);

  useEffect(() => {
    groupEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [groupMessages, activeTab]);

  useEffect(() => {
    supportEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [supportMessages, activeTab]);

  useEffect(() => {
    if (!user?.id) return;

    let channel = supabase.channel(`profile-support-${mode}-${user.id}-${supportThread?.id ?? "new"}`);

    if (!isDesk) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        () => {
          void loadGroupMessages();
        },
      );
    }

    if (!isCommunity) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_threads", filter: `user_id=eq.${user.id}` },
        () => {
          void loadSupportDesk();
        },
      );

      if (supportThread?.id) {
        channel = channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table: "support_messages", filter: `thread_id=eq.${supportThread.id}` },
          () => {
            void loadSupportDesk();
          },
        );
      }
    }

    if (!isCompact && !isCommunity && !isDesk) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: "support_tickets", filter: `user_id=eq.${user.id}` },
        () => {
          void loadTickets();
        },
      );
    }

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [isCompact, isCommunity, isDesk, mode, supportThread?.id, user?.id]);

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

  const compactTab: "group" | "support" = activeTab === "support" ? "support" : "group";
  const latestGroupMessage = groupMessages[groupMessages.length - 1] ?? null;
  const latestSupportMessage = supportMessages[supportMessages.length - 1] ?? null;
  const groupUnreadCount = Math.min(groupMessages.length, 99);
  const supportUnreadCount = supportThread?.status === "pending" ? 1 : 0;
  const notificationCount = supportUnreadCount + Number(Boolean(groupError || supportError));

  const compactRows = useMemo<CompactInboxRow[]>(() => {
    const generalRow: CompactInboxRow = {
      id: "general-chat",
      tab: "group",
      title: "General chat (English)",
      preview: trimPreview(latestGroupMessage?.message || "Public trader room."),
      time: formatInboxTime(latestGroupMessage?.created_at),
      unread: groupUnreadCount,
      avatarLabel: "EN",
      avatarUrl: latestGroupMessage?.profiles?.avatar_url,
    };

    const supportRow: CompactInboxRow = {
      id: "support-chat",
      tab: "support",
      title: "Support Chat (Online)",
      preview: supportThread ? "Private conversation with support." : "Start a private support chat.",
      time: formatInboxTime(latestSupportMessage?.created_at || supportThread?.updated_at),
      unread: supportUnreadCount,
      icon: LifeBuoy,
    };

    return compactTab === "support" ? [supportRow] : [generalRow];
  }, [
    compactTab,
    groupUnreadCount,
    latestGroupMessage?.created_at,
    latestGroupMessage?.message,
    latestGroupMessage?.profiles?.avatar_url,
    latestSupportMessage?.created_at,
    supportThread?.updated_at,
    supportThread,
    supportUnreadCount,
  ]);

  const filteredCompactRows = useMemo(() => {
    const query = chatSearch.trim().toLowerCase();
    if (!query) return compactRows;
    return compactRows.filter(
      (row) => row.title.toLowerCase().includes(query) || row.preview.toLowerCase().includes(query),
    );
  }, [chatSearch, compactRows]);

  const handleCompactSubmit = (event: FormEvent) => {
    if (compactTab === "support") {
      void handleSendSupportMessage(event);
      return;
    }
    void handleSendGroupMessage(event);
  };

  const compactInputValue = compactTab === "support" ? supportInput : groupInput;
  const isCompactSending = compactTab === "support" ? sendingSupport : sendingGroup;

  if (isCompact) {
    if (compactChatOpen) {
      const isSupportView = compactTab === "support";
      const compactTitle = isSupportView ? "Support Chat (Online)" : "General chat (English)";
      const compactSubtitle = isSupportView
        ? "Private desk conversation"
        : `${roomCount} traders active`;
      const compactMessages = isSupportView ? supportMessages : groupMessages;
      const compactLoading = isSupportView ? loadingSupport : loadingGroup;
      const compactError = isSupportView ? supportError : groupError;
      const EmptyIcon = isSupportView ? LifeBuoy : MessageSquare;

      return (
        <div className="flex h-full min-h-0 flex-col bg-[#0f1118] text-white">
          <div className="flex h-[58px] shrink-0 items-center gap-2 border-b border-white/[0.08] bg-[#11151f] px-3">
            <button
              type="button"
              onClick={() => setCompactChatOpen(false)}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.04] text-white/50 transition-colors hover:bg-white/[0.08] hover:text-white"
              aria-label="Back to chats"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <ChatAvatar
              alt={compactTitle}
              className="h-8 w-8 text-white"
              icon={isSupportView ? LifeBuoy : undefined}
              label={isSupportView ? undefined : "EN"}
              src={!isSupportView ? latestGroupMessage?.profiles?.avatar_url : null}
            />

            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-bold leading-5 text-white">{compactTitle}</div>
              <div className="truncate text-[10px] font-semibold text-[#7f8798]">{compactSubtitle}</div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {compactLoading ? (
              <div className="flex h-full items-center justify-center text-[12px] text-[#8a94a6]">
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Loading chat...
              </div>
            ) : compactError ? (
              <EmptyState description={compactError} icon={AlertCircle} title="Chat unavailable" />
            ) : compactMessages.length === 0 ? (
              <EmptyState
                description={isSupportView ? "Send a message and support will reply here." : "Start the trader room with a setup or question."}
                icon={EmptyIcon}
                title={isSupportView ? "No support messages yet" : "No trader messages yet"}
              />
            ) : isSupportView ? (
              <div className="space-y-3">
                {supportMessages.map((message) => {
                  const isMe = message.sender_id === user?.id && message.sender_role === "user";
                  return (
                    <div key={message.id} className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                      {!isMe ? (
                        <div className="mt-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#2b3344] text-[#66a9ff]">
                          <LifeBuoy className="h-4 w-4" />
                        </div>
                      ) : null}
                      <div className={`max-w-[82%] ${isMe ? "items-end" : "items-start"}`}>
                        <div className={`mb-1 text-[10px] text-[#7f8798] ${isMe ? "text-right" : "text-left"}`}>
                          {isMe ? "You" : message.sender_name || "Support"} - {formatTime(message.created_at)}
                        </div>
                        <div
                          className={`rounded-[10px] px-3 py-2 text-[12px] leading-5 ${
                            isMe
                              ? "rounded-tr-sm bg-[#0e8beb] text-white"
                              : "rounded-tl-sm bg-[#252d40] text-[#e9f1ff]"
                          }`}
                        >
                          {message.message}
                        </div>
                      </div>
                      {isMe ? <ChatAvatar alt={senderName} className="mt-5 h-8 w-8 text-white" src={profile?.avatar_url} /> : null}
                    </div>
                  );
                })}
                <div ref={supportEndRef} />
              </div>
            ) : (
              <div className="space-y-3">
                {groupMessages.map((message) => {
                  const isMe = message.user_id === user?.id;
                  const name = (message as Partial<ChatMessageRow>).sender_name || "Trader";
                  const avatarUrl = message.profiles?.avatar_url || (isMe ? profile?.avatar_url : null);

                  return (
                    <div key={message.id} className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                      {!isMe ? <ChatAvatar alt={name} className="mt-5 h-8 w-8 text-white" src={avatarUrl} /> : null}
                      <div className={`max-w-[82%] ${isMe ? "items-end" : "items-start"}`}>
                        <div className={`mb-1 text-[10px] text-[#7f8798] ${isMe ? "text-right" : "text-left"}`}>
                          {isMe ? "You" : name} - {formatTime(message.created_at)}
                        </div>
                        <div
                          className={`rounded-[10px] px-3 py-2 text-[12px] leading-5 ${
                            isMe
                              ? "rounded-tr-sm bg-[#0e8beb] text-white"
                              : "rounded-tl-sm bg-[#252d40] text-[#e9f1ff]"
                          }`}
                        >
                          {message.message}
                        </div>
                      </div>
                      {isMe ? <ChatAvatar alt={name} className="mt-5 h-8 w-8 text-white" src={avatarUrl} /> : null}
                    </div>
                  );
                })}
                <div ref={groupEndRef} />
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-white/[0.08] bg-[#11151f] px-3 py-2.5">
            <form onSubmit={handleCompactSubmit} className="flex items-center gap-2">
              <input
                type="text"
                value={compactInputValue}
                onChange={(event) => {
                  if (isSupportView) {
                    setSupportInput(event.target.value);
                    return;
                  }
                  setGroupInput(event.target.value);
                }}
                placeholder="Message text"
                className="h-9 flex-1 rounded-[8px] border border-white/[0.08] bg-[#171b25] px-3 text-[12px] text-white outline-none transition-colors placeholder:text-[#747d8d] focus:border-[#218cff]/60"
              />
              <button
                type="submit"
                disabled={isCompactSending || !compactInputValue.trim()}
                className="inline-flex h-9 w-9 items-center justify-center rounded-[8px] bg-[#0e8beb] text-white transition-colors hover:bg-[#0a7bd0] disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={isSupportView ? "Send support message" : "Send chat message"}
              >
                {isCompactSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              </button>
            </form>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full min-h-0 flex-col bg-[#0f1118] text-white">
        <div className="border-b border-white/[0.08] bg-[#11151f] px-3 py-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#7f8798]" />
              <input
                type="text"
                value={chatSearch}
                onChange={(event) => setChatSearch(event.target.value)}
                placeholder="Search..."
                className="h-8 w-full rounded-[8px] border border-white/[0.08] bg-[#171b25] pl-8 pr-2.5 text-[12px] text-white outline-none transition-colors placeholder:text-[#747d8d] focus:border-[#218cff]/60"
              />
            </div>
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-white/[0.08] bg-[#171b25] text-[#9ca7bb] transition-colors hover:bg-white/[0.06] hover:text-white"
              aria-label="Compose message"
            >
              <PencilLine className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("group")}
              className={`inline-flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                compactTab === "group"
                  ? "border-[#218cff]/50 bg-[#173055] text-white"
                  : "border-white/[0.08] bg-[#171b25] text-[#8e97a8] hover:text-white"
              }`}
            >
              Chats
              <span className="rounded-full bg-[#1889E6] px-1.5 py-[1px] text-[10px] font-bold leading-4 text-white">
                {Math.max(2, groupUnreadCount > 0 ? 3 : 2)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("support")}
              className={`inline-flex items-center gap-1.5 rounded-[8px] border px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                compactTab === "support"
                  ? "border-[#218cff]/50 bg-[#173055] text-white"
                  : "border-white/[0.08] bg-[#171b25] text-[#8e97a8] hover:text-white"
              }`}
            >
              Support
              <span className="rounded-full bg-[#1889E6] px-1.5 py-[1px] text-[10px] font-bold leading-4 text-white">
                {Math.max(notificationCount, 1)}
              </span>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loadingGroup && loadingSupport ? (
            <div className="flex items-center justify-center py-10 text-sm text-[#9EB0CE]">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading chats...
            </div>
          ) : filteredCompactRows.length === 0 ? (
            <EmptyState
              description="No chats matched your search."
              icon={MessageSquare}
              title="No conversation found"
            />
          ) : (
            filteredCompactRows.map((row) => {
              const isActiveRow = compactTab === row.tab && (row.id === "general-chat" || row.id === "support-chat");
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(row.tab);
                    setCompactChatOpen(row.id !== "favorites");
                  }}
                  className={`flex w-full items-start gap-2.5 border-b border-white/[0.07] px-3 py-2.5 text-left transition-colors ${
                    isActiveRow ? "bg-[#171f31]" : "hover:bg-white/[0.04]"
                  }`}
                >
                  <ChatAvatar alt={row.title} className="mt-0.5 h-8 w-8" icon={row.icon} label={row.avatarLabel} src={row.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-[12px] font-bold leading-5 text-white">{row.title}</p>
                      <span className="shrink-0 text-[10px] text-[#7f8798]">{row.time}</span>
                    </div>
                    <p className="truncate text-[11px] leading-4 text-[#8a94a6]">{row.preview}</p>
                  </div>
                  {row.unread > 0 ? (
                    <span className="mt-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#0E8BEB] px-1.5 text-[10px] font-bold text-white">
                      {row.unread > 99 ? "99+" : row.unread}
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>

        <div className="border-t border-white/[0.08] bg-[#11151f] px-3 py-2.5">
          <form onSubmit={handleCompactSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={compactInputValue}
              onChange={(event) => {
                if (compactTab === "support") {
                  setSupportInput(event.target.value);
                  return;
                }
                setGroupInput(event.target.value);
              }}
              placeholder={compactTab === "support" ? "Write to support..." : "Write to general chat..."}
              className="h-8 flex-1 rounded-[8px] border border-white/[0.08] bg-[#171b25] px-2.5 text-[12px] text-white outline-none transition-colors placeholder:text-[#747d8d] focus:border-[#218cff]/60"
            />
            <button
              type="submit"
              disabled={isCompactSending || !compactInputValue.trim()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-[8px] bg-[#0C89E7] text-white transition-colors hover:bg-[#0A7BD0] disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={compactTab === "support" ? "Send support message" : "Send chat message"}
            >
              {isCompactSending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            </button>
          </form>
          <div className="mt-2 flex items-center justify-between text-[10px] text-[#7f8798]">
            <span>{compactTab === "support" ? "Support desk online" : `${roomCount} traders active`}</span>
            <span className="inline-flex items-center gap-1">
              <Bell className="h-3 w-3" />
              Live updates
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-full min-h-0 flex-col text-white ${isCommunity ? "gap-0" : isCompact ? "gap-3" : "gap-4"}`}>
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

      {tabs.length > 1 ? (
      <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-[#11161d] p-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                isActive ? "bg-[#0fa053] text-white shadow-lg" : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>
      ) : null}

      {activeTab === "group" ? (
        <div className={`flex flex-1 min-h-0 flex-col border border-white/5 bg-[#11161d] ${isCommunity ? "overflow-hidden rounded-[26px]" : "rounded-2xl"}`}>
          <div className={`flex items-center justify-between border-b border-white/5 ${isCommunity ? "px-4 py-4 sm:px-5" : "px-4 py-3"}`}>
            <div>
              <h3 className={`${isCommunity ? "text-base sm:text-lg" : "text-sm"} font-bold text-white`}>
                {isCommunity ? "Community Chat" : "Traders Room"}
              </h3>
              <p className={`${isCommunity ? "mt-1 text-[12px]" : "text-[11px]"} text-gray-400`}>
                Fast ideas, market setups, and live chatter from the room.
              </p>
            </div>
            <div className={`rounded-full border border-emerald-500/20 bg-emerald-500/10 ${isCommunity ? "px-3 py-1.5 text-[11px]" : "px-2.5 py-1 text-[10px]"} font-bold uppercase tracking-wider text-emerald-300`}>
              {roomCount} online
            </div>
          </div>

          <div className={`min-h-0 flex-1 overflow-y-auto ${isCommunity ? "px-4 py-5 sm:px-5" : "px-4 py-4"}`}>
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
              <div className={`${isCommunity ? "space-y-5" : "space-y-4"}`}>
                {groupMessages.map((message) => {
                  const isMe = message.user_id === user?.id;
                  const name = (message as Partial<ChatMessageRow>).sender_name || "Trader";
                  const profileLink = message.profiles?.username ? `/traders/${message.profiles.username}` : null;
                  const avatarUrl = message.profiles?.avatar_url || (isMe ? profile?.avatar_url : null);

                  return (
                    <div key={message.id} className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                      {!isMe ? <ChatAvatar alt={name} className="mt-5 h-9 w-9" src={avatarUrl} /> : null}
                      <div className={`flex max-w-[92%] flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <div className="mb-1 flex items-center gap-2 px-1">
                          {!isMe ? (
                            profileLink ? (
                              <Link to={profileLink} className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#8be0af] hover:text-[#d8f6e5]">
                                <span>{name}</span>
                                {message.profiles?.vip_tier ? <VipBadge tierId={message.profiles.vip_tier as any} size={14} /> : null}
                              </Link>
                            ) : (
                              <span className="text-[11px] font-semibold text-[#8be0af]">{name}</span>
                            )
                          ) : (
                            <span className="text-[11px] font-semibold text-[#8be0af]">You</span>
                          )}
                          <span className="text-[10px] text-gray-500">{formatTime(message.created_at)}</span>
                        </div>
                        <div
                          className={`rounded-2xl px-3.5 ${isCommunity ? "py-3 text-[14px] leading-6 sm:max-w-[78%]" : "py-2.5 text-[13px] leading-6"} ${
                            isMe
                              ? "rounded-tr-sm bg-emerald-500 text-[#04150f]"
                              : "rounded-tl-sm border border-white/5 bg-[#151b24] text-gray-100"
                          }`}
                        >
                          {message.message}
                        </div>
                      </div>
                      {isMe ? <ChatAvatar alt={name} className="mt-5 h-9 w-9" src={avatarUrl} /> : null}
                    </div>
                  );
                })}
                <div ref={groupEndRef} />
              </div>
            )}
          </div>

          <div className={`border-t border-white/5 ${isCommunity ? "p-4" : "p-3"}`}>
            <form onSubmit={handleSendGroupMessage} className="flex items-center gap-2">
              <input
                type="text"
                value={groupInput}
                onChange={(event) => setGroupInput(event.target.value)}
                placeholder="Share a setup or market insight..."
                className={`flex-1 rounded-xl border border-white/10 bg-[#0b0e14] px-4 ${isCommunity ? "py-3.5 text-[15px]" : "py-3 text-sm"} text-white outline-none transition-colors placeholder:text-gray-500 focus:border-[#0fa053]`}
              />
              <button
                type="submit"
                disabled={sendingGroup || !groupInput.trim()}
                className={`inline-flex items-center justify-center rounded-xl bg-[#0fa053] text-white transition-colors hover:bg-[#2a955e] disabled:cursor-not-allowed disabled:opacity-60 ${isCommunity ? "h-[54px] w-[54px]" : "h-11 w-11"}`}
              >
                {sendingGroup ? <Loader2 className={`${isCommunity ? "h-5 w-5" : "h-4 w-4"} animate-spin`} /> : <Send className={isCommunity ? "h-5 w-5" : "h-4 w-4"} />}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {activeTab === "support" ? (
        <div className={`flex flex-1 min-h-0 flex-col border border-white/5 bg-[#11161d] ${isDesk ? "overflow-hidden rounded-[26px]" : "rounded-2xl"}`}>
          <div className={`border-b border-white/5 ${isDesk ? "px-4 py-4 sm:px-5" : "px-4 py-3"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0fa053]/15 text-[#8be0af]">
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

          <div className={`min-h-0 flex-1 overflow-y-auto ${isDesk ? "px-4 py-5 sm:px-5" : "px-4 py-4"}`}>
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
                    <div key={message.id} className={`flex gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                      {!isMe ? (
                        <ChatAvatar alt={message.sender_name || "Support"} className="mt-5 h-9 w-9" icon={LifeBuoy} />
                      ) : null}
                      <div className={`flex max-w-[88%] flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <div className="mb-1 flex items-center gap-2 px-1">
                          <span className="text-[11px] font-semibold text-emerald-300">
                            {isMe ? "You" : message.sender_name || "Desk"}
                          </span>
                          <span className="text-[10px] text-gray-500">{formatTime(message.created_at)}</span>
                        </div>
                        <div
                          className={`rounded-2xl px-3.5 py-2.5 text-[13px] leading-6 ${
                            isMe
                              ? "rounded-tr-sm bg-[#0fa053] text-white"
                              : "rounded-tl-sm border border-white/5 bg-[#151b24] text-gray-100"
                          }`}
                        >
                          {message.message}
                        </div>
                      </div>
                      {isMe ? <ChatAvatar alt={senderName} className="mt-5 h-9 w-9" src={profile?.avatar_url} /> : null}
                    </div>
                  );
                })}
                <div ref={supportEndRef} />
              </div>
            )}
          </div>

          <div className={`space-y-3 border-t border-white/5 ${isDesk ? "p-4" : "p-3"}`}>
            {!supportThread ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <select
                  value={supportCategory}
                  onChange={(event) => setSupportCategory(event.target.value)}
                  className="rounded-xl border border-white/10 bg-[#0b0e14] px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-[#0fa053]"
                >
                  <option>General</option>
                  <option>Deposits & Withdrawals</option>
                  <option>Verification (KYC)</option>
                  <option>Trading Issue</option>
                  <option>Security</option>
                </select>
                <div className="flex items-center rounded-xl border border-white/5 bg-[#0b0e14] px-3 text-xs text-gray-400">
                  <Clock3 className="mr-2 h-4 w-4 text-[#8be0af]" />
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
                className={`flex-1 rounded-xl border border-white/10 bg-[#0b0e14] px-4 ${isDesk ? "py-3.5 text-[15px]" : "py-3 text-sm"} text-white outline-none transition-colors placeholder:text-gray-500 focus:border-[#0fa053]`}
              />
              <button
                type="submit"
                disabled={sendingSupport || !supportInput.trim()}
                className={`inline-flex items-center justify-center rounded-xl bg-emerald-500 text-[#04150f] transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60 ${isDesk ? "h-[54px] w-[54px]" : "h-11 w-11"}`}
              >
                {sendingSupport ? <Loader2 className={`${isDesk ? "h-5 w-5" : "h-4 w-4"} animate-spin`} /> : <Send className={isDesk ? "h-5 w-5" : "h-4 w-4"} />}
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
              className="w-full rounded-xl border border-white/10 bg-[#0b0e14] px-3 py-3 text-sm text-white outline-none transition-colors focus:border-[#0fa053]"
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
              className="w-full rounded-xl border border-white/10 bg-[#0b0e14] px-3 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-[#0fa053]"
            />

            <select
              value={ticketForm.priority}
              onChange={(event) => setTicketForm((current) => ({ ...current, priority: event.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-[#0b0e14] px-3 py-3 text-sm text-white outline-none transition-colors focus:border-[#0fa053]"
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
              className="w-full resize-none rounded-xl border border-white/10 bg-[#0b0e14] px-3 py-3 text-sm text-white outline-none transition-colors placeholder:text-gray-500 focus:border-[#0fa053]"
            />

            <button
              type="submit"
              disabled={submittingTicket}
              className="inline-flex w-full items-center justify-center rounded-xl bg-[#0fa053] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#2a955e] disabled:cursor-not-allowed disabled:opacity-60"
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


