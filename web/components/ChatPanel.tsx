'use client';

import { useEffect, useRef, useState } from 'react';
import { Send, X } from 'lucide-react';
import type { ChatMessage } from '@/hooks/useMeeting';

interface ChatPanelProps {
  open: boolean;
  messages: ChatMessage[];
  peerName?: string;
  onClose: () => void;
  onSend: (text: string) => void;
}

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

/**
 * Slide-in chat panel. Renders the shared message log and a composer. Shown as
 * a right-side drawer on desktop and a bottom sheet on mobile.
 */
export function ChatPanel({
  open,
  messages,
  onClose,
  onSend,
}: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to the newest message.
  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  };

  return (
    <div
      className={`absolute z-40 inset-y-0 right-0 w-full sm:w-96 flex flex-col glass border-l border-white/10 transition-transform duration-300 ${
        open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
      }`}
      role="complementary"
      aria-label="Chat"
      aria-hidden={!open}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h2 className="text-sm font-semibold">In-call messages</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chat"
          className="w-8 h-8 rounded-full grid place-items-center hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 ? (
          <p className="text-xs text-slate-400 text-center mt-8">
            Messages are only visible to people in this call and are not saved.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.self ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="text-xs font-medium text-slate-300">
                  {m.self ? 'You' : m.displayName}
                </span>
                <span className="text-[10px] text-slate-500">
                  {formatTime(m.timestamp)}
                </span>
              </div>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words ${
                  m.self
                    ? 'bg-accent text-white rounded-br-sm'
                    : 'bg-white/10 text-slate-100 rounded-bl-sm'
                }`}
              >
                {m.text}
              </div>
            </div>
          ))
        )}
      </div>

      <form
        className="p-3 border-t border-white/10 flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          placeholder="Send a message"
          className="flex-1 glass rounded-full px-4 py-2 text-sm outline-none focus:border-accent placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Send message"
          className="w-10 h-10 rounded-full grid place-items-center bg-accent hover:bg-accent/90 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
