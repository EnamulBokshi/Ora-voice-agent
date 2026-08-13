'use client';

import { useState } from 'react';
import { Bot, Mic, Sparkles, Sliders, Volume2, ShieldCheck, Languages } from 'lucide-react';

export function AgentPersonaBar() {
  const [activePersona, setActivePersona] = useState<string>('Sales Expert');
  const [voiceModel, setVoiceModel] = useState<string>('Crystal-Voice v2.4 (180ms)');

  return (
    <div
      className="rounded-2xl p-5 border backdrop-blur-md mb-6 relative overflow-hidden transition-all"
      style={{
        background: 'color-mix(in srgb, var(--primary) 6%, var(--surface-container))',
        borderColor: 'color-mix(in srgb, var(--primary) 22%, transparent)',
      }}
    >
      {/* Background ambient glow */}
      <div
        className="absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ background: 'var(--primary)' }}
      />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
        {/* Left: ORA Persona Info */}
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-xl shrink-0 shadow-lg border relative"
            style={{
              background: 'var(--logo-gradient)',
              color: 'var(--logo-text)',
              borderColor: 'color-mix(in srgb, var(--primary) 35%, transparent)',
              boxShadow: 'var(--logo-glow)',
            }}
          >
            O
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[var(--ora-success)] border-2 border-[var(--surface-container)] rounded-full" />
          </div>

          <div>
            <div className="flex items-center gap-2.5 mb-0.5">
              <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
                ORA Agent Brain
              </h2>
              <span
                className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border flex items-center gap-1"
                style={{
                  background: 'color-mix(in srgb, var(--ora-success) 12%, transparent)',
                  borderColor: 'color-mix(in srgb, var(--ora-success) 25%, transparent)',
                  color: 'var(--ora-success)',
                }}
              >
                <ShieldCheck size={11} /> Online & Grounded
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Persona: <strong className="text-foreground">{activePersona}</strong> • Speech Latency: <span className="text-[var(--secondary)] font-mono">180ms</span>
            </p>
          </div>
        </div>

        {/* Right: Quick Controls & Badges */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Persona selector dropdown/pills */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl border text-xs"
            style={{
              background: 'var(--surface-container)',
              borderColor: 'var(--glass-border)',
            }}
          >
            {['Sales Expert', 'Friendly Support', 'Technical Advisor'].map((p) => (
              <button
                key={p}
                onClick={() => setActivePersona(p)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activePersona === p
                    ? 'bg-[var(--primary)] text-white shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Languages badge */}
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border"
            style={{
              background: 'var(--glass-bg)',
              borderColor: 'var(--glass-border)',
              color: 'var(--foreground)',
            }}
          >
            <Languages size={13} style={{ color: 'var(--secondary)' }} />
            EN + BN (Banglish)
          </span>

          {/* Voice Model Pill */}
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border font-mono"
            style={{
              background: 'color-mix(in srgb, var(--primary) 12%, transparent)',
              borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
              color: 'var(--primary)',
            }}
          >
            <Mic size={13} /> {voiceModel}
          </span>
        </div>
      </div>
    </div>
  );
}
