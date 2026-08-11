'use client';

import { Search, Mic, MessageSquare, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
import { ConversationItem } from '../conversation-types';

interface ConversationCardProps {
  item: ConversationItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

export function ConversationCard({ item, isSelected, onSelect }: ConversationCardProps) {
  return (
    <div
      onClick={() => onSelect(item.id)}
      className="p-3.5 rounded-xl border cursor-pointer relative overflow-hidden transition-all duration-200"
      style={{
        background: isSelected
          ? 'color-mix(in srgb, var(--primary) 10%, var(--surface-container))'
          : 'var(--glass-bg)',
        borderColor: isSelected ? 'var(--primary)' : 'var(--glass-border)',
        boxShadow: isSelected ? '0 0 12px color-mix(in srgb, var(--primary) 20%, transparent)' : 'none',
      }}
    >
      {/* Active selection bar */}
      {isSelected && (
        <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: 'var(--primary)' }} />
      )}

      {/* Card Header */}
      <div className="flex items-start justify-between mb-1.5">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <img
              src={item.avatar}
              alt={item.customerName}
              className="w-9 h-9 rounded-full object-cover border"
              style={{ borderColor: 'var(--glass-border)' }}
            />
            <div
              className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center border text-[8px]"
              style={{
                background: 'var(--surface-container)',
                borderColor: 'var(--glass-border)',
                color: item.channel === 'voice' ? 'var(--secondary)' : 'var(--muted-foreground)',
              }}
            >
              {item.channel === 'voice' ? <Mic size={9} /> : <MessageSquare size={9} />}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-semibold text-foreground leading-tight">{item.customerName}</h4>
            {item.status === 'active' && (
              <p className="text-[10px] font-medium flex items-center gap-1 mt-0.5" style={{ color: 'var(--primary)' }}>
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--primary)' }} />
                Voice Active
              </p>
            )}
            {item.status === 'completed' && (
              <p className="text-[10px] text-muted-foreground mt-0.5">Completed</p>
            )}
            {item.status === 'needs_attention' && (
              <p className="text-[10px] font-medium mt-0.5" style={{ color: 'var(--ora-error)' }}>
                Needs Attention
              </p>
            )}
          </div>
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">{item.lastMessageTime}</span>
      </div>

      {/* Message preview */}
      <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2">{item.previewMessage}</p>

      {/* Tag Badges */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {item.tags.map((tag, idx) => {
          if (tag.type === 'intent') {
            return (
              <span
                key={idx}
                className="px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1"
                style={{
                  background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                  color: 'var(--primary)',
                }}
              >
                <Search size={9} /> {tag.label}
              </span>
            );
          }
          if (tag.type === 'outcome') {
            return (
              <span
                key={idx}
                className="px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border"
                style={{
                  background: 'color-mix(in srgb, var(--secondary) 12%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--secondary) 25%, transparent)',
                  color: 'var(--secondary)',
                }}
              >
                <CheckCircle size={9} /> {tag.label}
              </span>
            );
          }
          if (tag.type === 'escalation') {
            return (
              <span
                key={idx}
                className="px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border"
                style={{
                  background: 'color-mix(in srgb, var(--ora-error) 12%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--ora-error) 25%, transparent)',
                  color: 'var(--ora-error)',
                }}
              >
                <AlertTriangle size={9} /> {tag.label}
              </span>
            );
          }
          return (
            <span
              key={idx}
              className="px-1.5 py-0.5 rounded text-[10px] font-medium flex items-center gap-1"
              style={{
                background: 'var(--surface-high)',
                color: 'var(--muted-foreground)',
              }}
            >
              <HelpCircle size={9} /> {tag.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
