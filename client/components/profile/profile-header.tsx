'use client';

import { User, Save, ShieldCheck } from 'lucide-react';

interface ProfileHeaderProps {
  onSave?: () => void;
}

export function ProfileHeader({ onSave }: ProfileHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1 flex items-center gap-2.5">
          <User size={24} style={{ color: 'var(--primary)' }} />
          Merchant Profile & Settings
        </h1>
        <p className="text-xs text-muted-foreground">
          Manage your store identity, team access, API keys, and account security.
        </p>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onSave}
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-lg transition-all flex items-center gap-2 hover:opacity-90 hover:scale-[1.02]"
          style={{
            background: 'var(--logo-gradient)',
            boxShadow: 'var(--logo-glow)',
          }}
        >
          <Save size={15} />
          Save profile
        </button>
      </div>
    </div>
  );
}
