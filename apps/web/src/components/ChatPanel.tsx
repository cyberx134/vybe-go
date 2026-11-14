import { useEffect, useRef, useState, type FormEvent } from 'react';
import { LIMITS } from '@vybe/shared';
import type { ChatLine } from '@vybe/client-core';
import { Icon } from './Icon';

interface ChatPanelProps {
  open: boolean;
  messages: ChatLine[];
  onClose: () => void;
  onSend: (text: string) => void;
}

export function ChatPanel({ open, messages, onClose, onSend }: ChatPanelProps) {
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft('');
  };

  return (
    <section className={open ? 'chat open' : 'chat'} aria-label="Chat" aria-hidden={!open}>
      <div className="chat-head">
        <span>Chat</span>
        <button className="icon-btn" type="button" aria-label="Close chat" onClick={onClose} style={{ width: 34, height: 34, borderRadius: 12 }}>
          <Icon name="close" size={16} />
        </button>
      </div>
      <div className="chat-messages" ref={listRef} aria-live="polite">
        {messages.length === 0 && <div className="bubble">Say hello to start the conversation.</div>}
        {messages.map((line) => (
          <div key={line.id} className={line.mine ? 'bubble mine' : 'bubble'}>
            {line.text}
          </div>
        ))}
      </div>
      <form className="chat-compose" onSubmit={submit}>
        <input
          ref={inputRef}
          value={draft}
          maxLength={LIMITS.maxMessageLength}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Type a message"
          aria-label="Message"
          autoComplete="off"
        />
        <button type="submit" aria-label="Send message">
          <Icon name="send" size={17} />
        </button>
      </form>
    </section>
  );
}
