import { useEffect, useRef, useState } from "react";
import { Check, CheckCheck, ChevronDown, X } from "lucide-react";
import type { TraderData } from "./WorkspaceLeaderboard";

type Message = {
  id: string;
  text: string;
  sender: "me" | "trader";
  timestamp: Date;
  delivered: boolean;
  read: boolean;
};

const mockReplies = [
  "Sure, I'll keep that in mind!",
  "Great trade today, did you catch the EUR/USD move?",
  "I'm looking at Gold for the next entry.",
  "Thanks for following my trades!",
  "The market is looking bullish on NASDAQ.",
  "Let me know if you need any trading tips.",
  "I've been using the 1-minute expiry strategy.",
  "Check out the Oil setup, looks promising.",
];

interface ChatDialogProps {
  trader: TraderData;
  onClose: () => void;
}

export const ChatDialog = ({ trader, onClose }: ChatDialogProps) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init-1",
      text: `Hi! I'm ${trader.name}. Feel free to ask me anything about my trades.`,
      sender: "trader",
      timestamp: new Date(Date.now() - 120000),
      delivered: true,
      read: true,
    },
    {
      id: "init-2",
      text: "👋 Welcome to the chat!",
      sender: "trader",
      timestamp: new Date(Date.now() - 60000),
      delivered: true,
      read: true,
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isOnline] = useState(trader.isOnline);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = () => {
    const text = inputText.trim();
    if (!text) return;

    const msg: Message = {
      id: `msg-${Date.now()}`,
      text,
      sender: "me",
      timestamp: new Date(),
      delivered: true,
      read: false,
    };

    setMessages((prev) => [...prev, msg]);
    setInputText("");
    setTyping(true);

    // Simulate reply after delay
    const delay = 1000 + Math.random() * 3000;
    setTimeout(() => {
      const reply: Message = {
        id: `reply-${Date.now()}`,
        text: mockReplies[Math.floor(Math.random() * mockReplies.length)],
        sender: "trader",
        timestamp: new Date(),
        delivered: true,
        read: false,
      };
      setMessages((prev) => [...prev, reply]);
      setTyping(false);

      // Mark previous messages as read
      setMessages((prev) =>
        prev.map((m) => (m.sender === "me" ? { ...m, read: true } : m))
      );
    }, delay);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 px-4 py-6"
      onClick={onClose}
    >
      <div
        className="flex h-[520px] w-full max-w-[420px] flex-col rounded-xl border border-[#2a3045] bg-[#1c2030] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#2a3045] px-4 py-3.5">
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
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[14px] font-semibold text-white">
              {trader.name}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-[#787b86]">
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  isOnline ? "bg-[#26a69a]" : "bg-[#787b86]"
                }`}
              />
              {isOnline ? "Online" : "Offline"}
              {isOnline && (
                <span className="text-[10px] text-[#26a69a]/60">· Active now</span>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-[#2a3045] bg-[#24293d] text-[#787b86] transition-colors hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-1 px-4 py-3">
          {messages.map((msg) => {
            const isMe = msg.sender === "me";
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                    isMe
                      ? "rounded-br-md bg-[#26a69a] text-white"
                      : "rounded-bl-md bg-[#24293d] text-[#e0e3eb]"
                  }`}
                >
                  <p className="text-[13px] leading-relaxed">{msg.text}</p>
                  <div
                    className={`mt-1 flex items-center gap-1 ${
                      isMe ? "justify-end" : "justify-start"
                    }`}
                  >
                    <span className="text-[10px] opacity-60">
                      {formatTime(msg.timestamp)}
                    </span>
                    {isMe && (
                      <span className="text-[10px]">
                        {msg.read ? (
                          <CheckCheck className="h-3 w-3 text-[#a8f0d6]" />
                        ) : msg.delivered ? (
                          <CheckCheck className="h-3 w-3 opacity-60" />
                        ) : (
                          <Check className="h-3 w-3 opacity-60" />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {typing && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-[#24293d] px-4 py-3">
                <div className="flex items-center gap-1">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#787b86]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#787b86]" style={{ animationDelay: "0.15s" }} />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-[#787b86]" style={{ animationDelay: "0.3s" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[#2a3045] px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              className="flex-1 rounded-lg border border-[#2a3045] bg-[#24293d] px-3.5 py-2.5 text-[13px] text-white outline-none placeholder:text-[#787b86] focus:border-[#26a69a]/50"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={!inputText.trim()}
              className="rounded-lg bg-[#26a69a] px-4 py-2.5 text-[13px] font-bold text-white transition-all hover:bg-[#1f8f84] disabled:opacity-40"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
