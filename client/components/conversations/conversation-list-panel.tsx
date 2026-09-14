'use client';

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
  const allCount = conversations.length;
  const activeCount = conversations.filter((c) => c.status === 'active').length;
  const completedCount = conversations.filter((c) => c.status === 'completed').length;

  const tabs: { id: 'all' | 'active' | 'completed'; label: string; count: number }[] = [
    { id: 'all',       label: 'All Calls',    count: allCount },
    { id: 'active',    label: 'Live Active',  count: activeCount },
    { id: 'completed', label: 'Archived',     count: completedCount },
  ];

  return (
    <div className="w-full md:w-[300px] lg:w-[320px] shrink-0 flex flex-col border-r border-border/40 h-full overflow-hidden bg-transparent">
      {/* ── Search & Filter Controls ── */}
      <div className="p-3.5 border-b border-border/40 space-y-3 bg-transparent flex-shrink-0">
        {/* Search Input */}
        <div className="relative w-full">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search voice calls…"
            className="w-full bg-surface-high/40 border border-border/60 rounded-md py-1.5 pl-8 pr-7 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Clean Underline Tabs */}
        <div className="flex items-center gap-4 text-[12px] font-medium border-b border-border/40 -mb-3.5 pb-0">
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => onTabChange(t.id)}
                className={cn(
                  'pb-2.5 relative transition-colors flex items-center gap-1 cursor-pointer',
                  isActive
                    ? 'text-foreground font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span>{t.label}</span>
                <span className="text-[10.5px] font-mono text-muted-foreground/70">
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Voice Call Rows List ── */}
      <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-border/30 bg-transparent">
        {conversations.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground px-4">
            <p className="font-medium text-foreground">No voice calls match</p>
            <p className="text-[11.5px] text-muted-foreground/70 mt-1">
              Try adjusting your search query or filter.
            </p>
          </div>
        ) : (
          conversations.map((item) => (
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
