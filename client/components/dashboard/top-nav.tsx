import Link from 'next/link';
import { Bell, Store } from 'lucide-react';
import { TopNavSearch } from './top-nav-search';
import { ThemeToggle } from './theme-toggle';

interface TopNavProps {
  greeting?: string;
  activeTab?: 'overview' | 'live-activity' | 'conversations';
}

export function TopNav({ greeting, activeTab = 'overview' }: TopNavProps) {
  // Default greeting if none provided
  const displayTitle = greeting || 'Good morning, Ahmed 👋';

  return (
    <header
      className="fixed top-0 right-0 w-[calc(100%-280px)] backdrop-blur-xl flex justify-between items-center px-6 lg:px-8 h-16 z-40"
      style={{
        background:   'var(--topnav-bg)',
        borderBottom: '1px solid var(--topnav-border)',
      }}
    >
      {/* Page Title & Navigation Tabs */}
      <div className="flex items-center gap-6">
        <h2 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
          {displayTitle}
        </h2>

        {/* Tab links pill bar */}
        <nav
          className="hidden md:flex items-center gap-1 p-1 rounded-xl border text-xs"
          style={{
            background: 'var(--glass-bg)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <Link
            href="/"
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              activeTab === 'overview'
                ? 'bg-[var(--surface-high)] text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Overview
          </Link>
          <Link
            href="/live-activity"
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              activeTab === 'live-activity'
                ? 'bg-[var(--surface-high)] text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Live Activity
          </Link>
          <Link
            href="/conversations"
            className={`px-3 py-1 rounded-lg font-medium transition-all ${
              activeTab === 'conversations'
                ? 'bg-[var(--surface-high)] text-foreground shadow-sm font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Conversations
          </Link>
        </nav>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2.5">
        <TopNavSearch />

        <ThemeToggle />

        <button
          id="top-nav-notifications"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-[var(--surface-high)] transition-all duration-200"
          aria-label="Notifications"
        >
          <Bell size={17} />
        </button>

        <button
          id="top-nav-storefront"
          className="w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-[var(--surface-high)] transition-all duration-200"
          aria-label="Storefront"
        >
          <Store size={17} />
        </button>
      </div>
    </header>
  );
}
