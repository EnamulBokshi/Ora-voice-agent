'use client';

import { Users, UserPlus, ShieldCheck, Mail } from 'lucide-react';

const TEAM = [
  { name: 'Fahad Ahmed',    email: 'fahad@hypecorp.com',    role: 'Store Owner',   status: 'Active' },
  { name: 'Tanvir Hossain', email: 'tanvir@hypecorp.com',   role: 'Sales Manager', status: 'Active' },
  { name: 'Ayesha Siddika', email: 'ayesha@hypecorp.com',   role: 'Support Lead',  status: 'Active' },
];

export function TeamMembersCard() {
  return (
    <div
      className="rounded-2xl p-6 border backdrop-blur-md relative overflow-hidden"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
      }}
    >
      <div className="flex justify-between items-center mb-6 pb-3 border-b" style={{ borderColor: 'var(--glass-border)' }}>
        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
          <Users size={15} style={{ color: 'var(--primary)' }} /> Team Members & Roles
        </h3>

        <button
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90 flex items-center gap-1.5 shadow-md"
          style={{ background: 'var(--primary)' }}
        >
          <UserPlus size={13} /> Invite Member
        </button>
      </div>

      <div className="space-y-3 text-xs">
        {TEAM.map((m) => (
          <div
            key={m.email}
            className="p-3.5 rounded-xl border flex justify-between items-center"
            style={{
              background: 'var(--surface-container)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs border shrink-0"
                style={{
                  background: 'var(--surface-high)',
                  borderColor: 'var(--glass-border)',
                  color: 'var(--primary)',
                }}
              >
                {m.name.charAt(0)}
              </div>
              <div>
                <p className="font-bold text-foreground">{m.name}</p>
                <p className="text-[11px] text-muted-foreground">{m.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold border"
                style={{
                  background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
                  color: 'var(--primary)',
                }}
              >
                {m.role}
              </span>
              <span className="text-[11px] font-semibold text-[var(--ora-success)]">● {m.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
