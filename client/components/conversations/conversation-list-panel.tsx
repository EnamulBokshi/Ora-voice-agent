'use client';

import { Search, Filter, ArrowUpDown } from 'lucide-react';
import { ConversationItem } from './conversation-types';
import { ConversationCard } from './subcomponents/conversation-card';

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
  const activeCount = conversations.filter((c) => c.status === 'active').length;
  const completedCount = conversations.filter((c) => c.status === 'completed').length;
  const allCount = conversations.length;

  return (
    <div
      className="w-[320px] shrink-0 flex flex-col border-r h-full overflow-hidden"
      style={{
        background: 'var(--surface-container)',
        borderColor: 'var(--glass-border)',
      }}
    >
      {/* Search & Filter Header */}
      <div className="p-3.5 border-b flex flex-col gap-2.5" style={{ borderColor: 'var(--glass-border)' }}>
        <div className="relative w-full">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-full bg-[var(--surface-high)] border rounded-xl py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
            style={{ borderColor: 'var(--glass-border)' }}
          />
        </div>

        <div className="flex items-center justify-between gap-1.5">
          {/* Tabs */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl border text-xs flex-1"
            style={{
              background: 'var(--glass-bg)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <button
              onClick={() => onTabChange('all')}
              className={`flex-1 py-1 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1 text-[11px] ${
                activeTab === 'all'
                  ? 'bg-[var(--surface-high)] text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              All
              <span className="text-[9px] px-1 rounded" style={{ background: 'var(--surface-lowest)' }}>
                {allCount}
              </span>
            </button>

            <button
              onClick={() => onTabChange('active')}
              className={`flex-1 py-1 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1 text-[11px] ${
                activeTab === 'active'
                  ? 'bg-[var(--surface-high)] text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Active
              <span
                className="text-[9px] px-1 rounded font-bold"
                style={{
                  background: 'color-mix(in srgb, var(--primary) 15%, transparent)',
                  color: 'var(--primary)',
                }}
              >
                {activeCount}
              </span>
            </button>

            <button
              onClick={() => onTabChange('completed')}
              className={`flex-1 py-1 rounded-lg font-medium transition-all text-center flex items-center justify-center gap-1 text-[11px] ${
                activeTab === 'completed'
                  ? 'bg-[var(--surface-high)] text-foreground shadow-sm font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Done
              <span className="text-[9px] px-1 rounded" style={{ background: 'var(--surface-lowest)' }}>
                {completedCount}
              </span>
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground border hover:bg-[var(--surface-high)] transition-colors"
              style={{ borderColor: 'var(--glass-border)' }}
              title="Filter"
            >
              <Filter size={13} />
            </button>
            <button
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground border hover:bg-[var(--surface-high)] transition-colors"
              style={{ borderColor: 'var(--glass-border)' }}
              title="Sort"
            >
              <ArrowUpDown size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Conversation Cards List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {conversations.map((item) => (
          <ConversationCard
            key={item.id}
            item={item}
            isSelected={item.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}
