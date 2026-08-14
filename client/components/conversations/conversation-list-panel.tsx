'use client';

import { useState } from 'react';
import { Search, X, Mic, MessageSquare, Filter } from 'lucide-react';
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

  return (
    <div className="w-[320px] lg:w-[340px] shrink-0 flex flex-col border-r border-border h-full overflow-hidden bg-surface-container">
      {/* ── Search & Filter Controls ── */}
      <div className="p-3.5 border-b border-border space-y-2.5 bg-surface-low/50">
        <div className="relative w-full">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-surface-low border border-border rounded py-1.5 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
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

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 p-1 rounded border border-border bg-surface-low text-xs">
          <button
            onClick={() => onTabChange('all')}
            className={cn(
              'flex-1 py-1 rounded text-[11px] font-medium transition-all text-center flex items-center justify-center gap-1',
              activeTab === 'all'
                ? 'bg-surface-high text-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            All
            <span className="text-[9px] px-1 py-0.2 rounded bg-surface-container border border-border">
              {allCount}
            </span>
          </button>

          <button
            onClick={() => onTabChange('active')}
            className={cn(
              'flex-1 py-1 rounded text-[11px] font-medium transition-all text-center flex items-center justify-center gap-1',
              activeTab === 'active'
                ? 'bg-surface-high text-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Active
            <span className="text-[9px] px-1 py-0.2 rounded bg-surface-container border border-border text-primary font-bold">
              {activeCount}
            </span>
          </button>

          <button
            onClick={() => onTabChange('completed')}
            className={cn(
              'flex-1 py-1 rounded text-[11px] font-medium transition-all text-center flex items-center justify-center gap-1',
              activeTab === 'completed'
                ? 'bg-surface-high text-foreground font-semibold shadow-xs'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Done
            <span className="text-[9px] px-1 py-0.2 rounded bg-surface-container border border-border">
              {completedCount}
            </span>
          </button>
        </div>

        {/* Channel Filter Pills */}
        <div className="flex items-center gap-1 text-[10px]">
          <span className="text-muted-foreground mr-1 flex items-center gap-1">
            <Filter size={10} /> Channel:
          </span>
          {[
            { id: 'all', label: 'All' },
            { id: 'voice', label: 'Voice' },
            { id: 'chat', label: 'Chat' },
          ].map((ch) => (
            <button
              key={ch.id}
              onClick={() => setChannelFilter(ch.id as any)}
              className={cn(
                'px-2 py-0.5 rounded font-medium transition-colors',
                channelFilter === ch.id
                  ? 'bg-surface-high text-foreground font-semibold border border-border'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {ch.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Conversation Cards List ── */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground px-4">
            <p>No conversations match.</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">
              Try adjusting your filter or search query.
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
