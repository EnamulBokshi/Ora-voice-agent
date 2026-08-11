'use client';

import { CheckCircle2, PackageCheck } from 'lucide-react';
import { TranscriptMessage } from '../conversation-types';

interface TranscriptBubbleProps {
  message: TranscriptMessage;
  customerAvatar: string;
  customerName: string;
}

export function TranscriptBubble({ message: msg, customerAvatar, customerName }: TranscriptBubbleProps) {
  if (msg.sender === 'customer') {
    return (
      <div className="flex items-end gap-3 self-start max-w-[80%]">
        <img
          src={customerAvatar}
          alt={customerName}
          className="w-7 h-7 rounded-full object-cover border opacity-90 shrink-0"
          style={{ borderColor: 'var(--glass-border)' }}
        />
        <div
          className="rounded-2xl rounded-bl-sm p-3.5 border shadow-sm text-sm text-foreground leading-relaxed"
          style={{
            background: 'var(--surface-high)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <p>{msg.text}</p>
        </div>
      </div>
    );
  }

  // ORA Agent Message
  return (
    <div className="flex items-end gap-3 self-end max-w-[85%] flex-row-reverse">
      {/* ORA Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-md border"
        style={{
          background: 'var(--logo-gradient)',
          color: 'var(--logo-text)',
          borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)',
        }}
      >
        O
      </div>

      {/* Typing state or content */}
      {msg.isTyping ? (
        <div
          className="rounded-2xl rounded-br-sm p-3 flex items-center gap-1.5"
          style={{
            background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)',
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--primary)', animationDelay: '0s' }} />
          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--primary)', animationDelay: '0.15s' }} />
          <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--primary)', animationDelay: '0.3s' }} />
        </div>
      ) : (
        <div
          className="rounded-2xl rounded-br-sm p-4 shadow-sm text-sm text-foreground flex flex-col gap-3 leading-relaxed"
          style={{
            background: 'color-mix(in srgb, var(--primary) 8%, transparent)',
            border: '1px solid color-mix(in srgb, var(--primary) 25%, transparent)',
          }}
        >
          <p>{msg.text}</p>

          {/* Inline Product Card if available */}
          {msg.product && (
            <div
              className="rounded-xl p-3 flex gap-3.5 border transition-all cursor-pointer group"
              style={{
                background: 'var(--surface-container)',
                borderColor: 'var(--glass-border)',
              }}
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border" style={{ borderColor: 'var(--glass-border)' }}>
                <img
                  src={msg.product.image}
                  alt={msg.product.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <div className="flex justify-between items-start">
                  <h4 className="font-semibold text-xs text-foreground truncate">{msg.product.name}</h4>
                  <span className="font-mono font-bold text-xs" style={{ color: 'var(--primary)' }}>
                    {msg.product.price}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{msg.product.description}</p>

                <div className="flex items-center gap-2 mt-2">
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border"
                    style={{
                      background: 'color-mix(in srgb, var(--secondary) 12%, transparent)',
                      color: 'var(--secondary)',
                      borderColor: 'color-mix(in srgb, var(--secondary) 25%, transparent)',
                    }}
                  >
                    <PackageCheck size={10} /> In stock
                  </span>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border"
                    style={{
                      background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                      color: 'var(--primary)',
                      borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
                    }}
                  >
                    <CheckCircle2 size={10} /> Live verified
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
