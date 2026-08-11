'use client';

import { useState } from 'react';
import { Terminal, RotateCcw, Zap, Send, Bot, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'ora' | 'system';
  text: string;
}

export function PlaybookSimulator() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'user', text: 'Looking for running shoes under $100.' },
    { id: '2', sender: 'system', text: 'TRIGGER: BUDGET CONSTRAINT DETECTED' },
    {
      id: '3',
      sender: 'ora',
      text: "I'd recommend the Pegasus 41. It's a great all-around shoe currently on sale for $95, fitting perfectly under your budget.",
    },
    { id: '4', sender: 'user', text: 'Anything better?' },
    { id: '5', sender: 'system', text: 'RULE APPLIED: UPSELL (QUALITY REQUEST)' },
    {
      id: '6',
      sender: 'ora',
      text: "If you're willing to go slightly over budget to $115, the ZoomX Invincible offers significantly better cushioning and durability for long runs.",
    },
  ]);

  function handleSend() {
    if (!input.trim()) return;

    const userMsg: Message = { id: String(Date.now()), sender: 'user', text: input };
    const sysMsg: Message = {
      id: String(Date.now() + 1),
      sender: 'system',
      text: 'RULE APPLIED: INTENT MATCH & UPSELL EVALUATED',
    };
    const oraMsg: Message = {
      id: String(Date.now() + 2),
      sender: 'ora',
      text: `Simulated ORA Response for "${input}": Rules applied successfully based on active playbook weights!`,
    };

    setMessages((prev) => [...prev, userMsg, sysMsg, oraMsg]);
    setInput('');
  }

  function handleReset() {
    setMessages([
      { id: '1', sender: 'user', text: 'Looking for running shoes under $100.' },
      { id: '2', sender: 'system', text: 'TRIGGER: BUDGET CONSTRAINT DETECTED' },
      {
        id: '3',
        sender: 'ora',
        text: "I'd recommend the Pegasus 41. It's a great all-around shoe currently on sale for $95, fitting perfectly under your budget.",
      },
    ]);
  }

  return (
    <div
      className="rounded-2xl border flex flex-col overflow-hidden backdrop-blur-md h-[420px] shadow-xl relative"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)',
        boxShadow: '0 0 24px color-mix(in srgb, var(--primary) 12%, transparent)',
      }}
    >
      {/* Simulator Header */}
      <div
        className="p-3.5 border-b flex justify-between items-center shrink-0"
        style={{
          background: 'var(--surface-container)',
          borderColor: 'var(--glass-border)',
        }}
      >
        <div className="flex items-center gap-2">
          <Terminal size={15} style={{ color: 'var(--primary)' }} />
          <span className="text-xs font-bold text-foreground tracking-tight">Playbook AI Simulator</span>
          <span
            className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border"
            style={{
              background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
              borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
              color: 'var(--primary)',
            }}
          >
            Live Sandbox
          </span>
        </div>
        <button
          onClick={handleReset}
          className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg transition-colors hover:bg-[var(--surface-high)]"
          title="Reset Simulator"
        >
          <RotateCcw size={13} />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 text-xs bg-[var(--surface-lowest)]/40">
        {messages.map((m) => {
          if (m.sender === 'user') {
            return (
              <div key={m.id} className="flex justify-end">
                <div
                  className="rounded-2xl rounded-tr-xs p-3 max-w-[85%] text-foreground shadow-sm"
                  style={{
                    background: 'var(--surface-high)',
                    border: '1px solid var(--glass-border)',
                  }}
                >
                  <p>{m.text}</p>
                </div>
              </div>
            );
          }

          if (m.sender === 'system') {
            return (
              <div key={m.id} className="flex justify-center my-1">
                <div
                  className="px-3 py-1 rounded-full text-[10px] font-semibold tracking-wider flex items-center gap-1.5 border shadow-sm"
                  style={{
                    background: 'color-mix(in srgb, var(--secondary) 12%, transparent)',
                    borderColor: 'color-mix(in srgb, var(--secondary) 25%, transparent)',
                    color: 'var(--secondary)',
                  }}
                >
                  <Zap size={11} /> {m.text}
                </div>
              </div>
            );
          }

          return (
            <div key={m.id} className="flex justify-start">
              <div
                className="rounded-2xl rounded-tl-xs p-3.5 max-w-[85%] relative border shadow-sm"
                style={{
                  background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
                  color: 'var(--foreground)',
                }}
              >
                <div
                  className="absolute -left-2 -top-2 w-5 h-5 rounded-md flex items-center justify-center border shadow-md text-[10px]"
                  style={{
                    background: 'var(--logo-gradient)',
                    color: 'var(--logo-text)',
                    borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)',
                  }}
                >
                  <Bot size={11} />
                </div>
                <p className="mt-1 leading-relaxed">{m.text}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Input Form */}
      <div className="p-3 border-t shrink-0" style={{ background: 'var(--surface-container)', borderColor: 'var(--glass-border)' }}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="relative flex items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type to test rules..."
            className="w-full bg-[var(--surface-high)] border rounded-xl py-2 pl-3 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
            style={{ borderColor: 'var(--glass-border)' }}
          />
          <button
            type="submit"
            className="absolute right-2 p-1.5 rounded-lg text-[var(--primary)] hover:bg-[var(--primary)]/10 transition-colors"
          >
            <Send size={14} />
          </button>
        </form>
      </div>
    </div>
  );
}
