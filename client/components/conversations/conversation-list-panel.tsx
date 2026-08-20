'use client';

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { ConversationItem } from './conversation-types';
import { ConversationCard } from './subcomponents/conversation-card';
import { cn } from '@/lib/utils';

interface ConversationListPanelProps {
  conversations: ConversationItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  activeTab: 'all' | 'active' | 'completed';
  onTabChange: (tab: 'all' | 'active' | 'completed') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export function ConversationListPanel({
  conversations,
  selectedId,
  onSelect,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
}: ConversationListPanelProps) {
  const [channelFilter, setChannelFilter] = useState<'all' | 'voice' | 'chat'>('all');

  const filtered = conversations.filter((c) => {
    if (channelFilter !== 'all' && c.channel !== channelFilter) return false;
    return true;
  });

  const activeCount = conversations.filter((c) => c.status === 'active').length;
  const completedCount = conversations.filter((c) => c.status === 'completed').length;
  const allCount = conversations.length;

  const tabs: { id: 'all' | 'active' | 'completed'; label: string; count: number }[] = [
    { id: 'all',       label: 'All',    count: allCount },
    { id: 'active',    label: 'Active', count: activeCount },
    { id: 'completed', label: 'Closed', count: completedCount },
  ];

  return (
    <div className="w-[320px] lg:w-[340px] shrink-0 flex flex-col border-r border-border h-full overflow-hidden bg-background">
      {/* ── Search & Filter Controls ── */}
      <div className="p-3.5 border-b border-border space-y-3 bg-surface-lowest flex-shrink-0">
        {/* Search Input */}
        <div className="relative w-full">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations…"
            className="w-full bg-surface-high/60 border border-border rounded py-1.5 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Intercom Style Underline Tabs */}
        <div className="flex items-center gap-4 text-[12px] font-medium border-b border-border/60 -mb-3.5 pb-0">
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                className={cn(
                  'pb-2.5 relative transition-colors flex items-center gap-1.5',
                  isActive
                    ? 'text-foreground font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span>{t.label}</span>
                <span className="text-[10px] font-mono text-muted-foreground/70">
                  {t.count}
                </span>
              </button>
            );
          })}

          {/* Channel selector on the right */}
          <div className="ml-auto flex items-center gap-1 text-[10.5px] pb-2.5">
            {(['all', 'voice', 'chat'] as const).map((ch) => (
              <button
                key={ch}
                onClick={() => setChannelFilter(ch)}
                className={cn(
                  'capitalize px-1.5 py-0.5 rounded transition-colors',
                  channelFilter === ch
                    ? 'text-foreground font-semibold bg-surface-high'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {ch}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Conversation Rows List ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-border/30">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground px-4">
            <p className="font-medium text-foreground">No conversations match</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">
              Try adjusting your search query or filter.
            </p>
          </div>
        ) : (
          filtered.map((item) => (
            <ConversationCard
              key={item.id}
              item={item}
              isSelected={item.id === selectedId}
              onSelect={onSelect}
            />
          ))
        )}
      </div>
    </div>
  );
}
