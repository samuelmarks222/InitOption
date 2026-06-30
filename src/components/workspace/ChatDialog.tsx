import { useState, useRef, useEffect, useCallback } from "react";
import {
  Check,
  CheckCheck,
  X,
  Send,
  Mic,
  Paperclip,
  MoreVertical,
  Smile,
  ChevronDown,
} from "lucide-react";
import type { TraderData } from "./WorkspaceLeaderboard";
import type { ChatMessage } from "./ChatMessages";
import { useChatService } from "./ChatService";

interface ChatDialogProps {
  trader: TraderData;
  onClose: () => void;
}

function formatTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function getStatusIcon(status: ChatMessage["status"], isRead: boolean) {
  if (!status || status === "sending") {
    return <span className="w-4 h-4 opacity-40">⏳</span>;
  }
  if (status === "sent") {
    return <Check className="w-4 h-4 opacity-50" strokeWidth={2.5} />;
  }
  if (status === "delivered") {
    return <CheckCheck className="w-4 h-4 opacity-50" strokeWidth={2.5} />;
  }
  if (status === "read") {
    return <CheckCheck className="w-4 h-4 text-[#a8f0d6]" strokeWidth={2.5} />;
  }
  return null;
}

export const ChatDialog = ({ trader, onClose }: ChatDialogProps) => {
  const {
    messages,
    traderProfile,
    chatState,
    typingText,
    unreadCount,
    isFocused,
    sendMessage,
    setFocus,
    formatTime: svcFormatTime,
    formatDate: svcFormatDate,
    getOnlineStatusText,
    clearAllTimers,
  } = useChatService(trader);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [inputText, setInputText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  const [isComposing, setIsComposing] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatState, typingText]);

  useEffect(() => {
    inputRef.current?.focus();
    setFocus(true);
    return () => setFocus(false);
  }, [setFocus]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    sendMessage(text);
    setInputText("");
    setShowEmoji(false);
    setShowAttach(false);
  }, [inputText, sendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
  }, []);

  const onlineStatus = getOnlineStatusText();
  const isOnline = traderProfile.isOnline;

  const groupedMessages = messages.reduce((acc, msg) => {
    const dateKey = svcFormatDate(msg.timestamp);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(msg);
    return acc;
  }, {} as Record<string, ChatMessage[]>);

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 px-4 py-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Chat with ${trader.name}`}
    >
      <div
        className="flex h-[580px] w-full max-w-[420px] flex-col rounded-xl border border-[#2a3045] bg-[#1c2030] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#2a3045] px-4 py-3.5 shrink-0">
          <div className="relative shrink-0">
            <img
              src={trader.flagUrl}
              alt=""
              className="h-9 w-9 rounded-full border border-[#2a3045] object-cover"
            />
            <span
              className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#1c2030] ${
                isOnline ? "bg-[#26a69a]" : "bg-[#787b86]"
              }`}
              aria-label={isOnline ? "Online" : "Offline"}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold text-white">{trader.name}</div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#787b86]">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  isOnline ? "bg-[#26a69a]" : "bg-[#787b86]"
                }`}
              />
              <span className={isOnline ? "text-[#26a69a]" : "text-[#787b86]"}>
                {onlineStatus}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-[#2a3045] bg-[#24293d] text-[#787b86] transition-colors hover:text-white"
              aria-label="Voice call"
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-[#2a3045] bg-[#24293d] text-[#787b86] transition-colors hover:text-white"
              aria-label="Video call"
            >
              <ChevronDown className="h-4 w-4 rotate-180" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-[#2a3045] bg-[#24293d] text-[#787b86] transition-colors hover:text-white"
              aria-label="Close chat"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 px-4 py-4" style={{ background: "var(--trading-workspace-bg)" }}>
          {Object.entries(groupedMessages).map(([dateKey, dayMessages]) => (
            <div key={dateKey} className="flex flex-col items-center">
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#23283b]" />
                </div>
                <span className="relative bg-[#1c2030] px-3 py-0.5 text-[11px] font-medium text-[#787b86] uppercase tracking-wider">
                  {dateKey}
                </span>
              </div>
              {dayMessages.map((msg, idx) => {
                const isMe = msg.sender === "me";
                const showTail = idx === dayMessages.length - 1 || dayMessages[idx + 1].sender !== msg.sender;
                const prevMsg = idx > 0 ? dayMessages[idx - 1] : null;
                const showTime = !prevMsg || prevMsg.sender !== msg.sender || msg.timestamp - prevMsg.timestamp > 180000;

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isMe ? "justify-end" : "justify-start"} ${showTail ? "pb-1" : "pb-0"}`}
                  >
                    <div
                      className={`max-w-[75%] relative ${
                        isMe
                          ? "rounded-2xl rounded-br-none bg-[#26a69a] text-white"
                          : "rounded-2xl rounded-bl-none bg-[#24293d] text-[#e0e3eb]"
                      }`}
                    >
                      <p className="text-[13px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      {showTime && (
                        <div
                          className={`mt-1.5 flex items-center gap-1.5 ${
                            isMe ? "justify-end" : "justify-start"
                          }`}
                        >
                          <span className="text-[10px] opacity-50">{svcFormatTime(msg.timestamp)}</span>
                          {isMe && (
                            <span className="flex items-center" aria-label={msg.status === "read" ? "Read" : msg.status === "delivered" ? "Delivered" : msg.status === "sent" ? "Sent" : "Sending"}>
                              {getStatusIcon(msg.status, msg.status === "read")}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    {showTail && !isMe && (
                      <div className="w-8 flex items-end justify-start -ml-2">
                        <div className="w-2 h-2 rounded-full bg-[#24293d] ml-1" />
                      </div>
                    )}
                    {showTail && isMe && (
                      <div className="w-8 flex items-end justify-end -mr-2">
                        <div className="w-2 h-2 rounded-full bg-[#26a69a] mr-1" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {chatState === "typing" && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-none bg-[#24293d] px-4 py-2.5">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#787b86]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#787b86]" style={{ animationDelay: "0.15s" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#787b86]" style={{ animationDelay: "0.3s" }} />
                  <span className="ml-1 text-[11px] text-[#787b86]">{typingText}</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-[#2a3045] shrink-0">
          <div className="flex items-end gap-2 px-3 py-3">
            <button
              type="button"
              onClick={() => setShowEmoji(!showEmoji)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#787b86] transition-colors hover:bg-white/[0.06] hover:text-white"
              aria-label="Emoji"
            >
              <Smile className="h-5 w-5" />
            </button>

            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => setIsComposing(true)}
                onCompositionEnd={(e) => { setIsComposing(false); handleInputChange(e as any); }}
                placeholder="Type a message..."
                rows={1}
                className="w-full rounded-2xl border border-[#2a3045] bg-[#24293d] px-4 py-2.5 text-[13px] text-white outline-none placeholder:text-[#787b86] focus:border-[#26a69a]/50 resize-none max-h-[120px]"
                style={{ minHeight: "44px" }}
              />
              {showEmoji && (
                <div className="absolute bottom-full left-0 right-0 mb-2 p-3 bg-[#24293d] rounded-xl border border-[#2a3045] shadow-lg">
                  <div className="grid grid-cols-8 gap-1">
                    {["👍", "👏", "🔥", "😅", "😂", "🤔", "💪", "🎉", "👌", "🙏", "😎", "📈", "📉", "💰", "🏆", "✅", "❌", "❓", "⚡", "☕", "🌙", "🚀", "💎", "🎯", "🔑"].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setInputText((prev) => prev + emoji)}
                        className="text-2xl hover:scale-125 transition-transform"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSend}
              disabled={!inputText.trim() || isComposing}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#26a69a] text-white transition-all hover:bg-[#1f8f84] disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.95]"
              aria-label="Send message"
            >
              <Send className="h-5 w-5" strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};