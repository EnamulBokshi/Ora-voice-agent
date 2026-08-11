'use client';

import { useState } from 'react';
import { Key, Copy, Check, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export function SecurityApiKeysCard() {
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const apiKey = 'ora_live_sk_9082bd_urbanstore_production_2026';

  const handleCopy = () => {
    navigator.clipboard.writeText(apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div
      className="rounded-2xl p-6 border backdrop-blur-md relative overflow-hidden"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
      }}
    >
      <h3 className="text-xs font-bold uppercase tracking-wider text-foreground mb-6 pb-3 border-b" style={{ borderColor: 'var(--glass-border)' }}>
        API Keys & Webhook Security
      </h3>

      <div className="space-y-4 text-xs">
        <div>
          <label className="text-muted-foreground font-semibold block mb-1.5 flex items-center gap-1.5">
            <Key size={13} style={{ color: 'var(--primary)' }} /> Secret Production API Key
          </label>

          <div className="relative">
            <input
              type={showSecret ? 'text' : 'password'}
              readOnly
              value={apiKey}
              className="w-full bg-[var(--surface-high)] border rounded-xl py-2.5 pl-3.5 pr-20 text-xs font-mono text-foreground focus:outline-none"
              style={{ borderColor: 'var(--glass-border)' }}
            />

            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <button
                onClick={() => setShowSecret(!showSecret)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                title="Toggle Visibility"
              >
                {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
              <button
                onClick={handleCopy}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-[var(--primary)] transition-colors"
                title="Copy API Key"
              >
                {copiedKey ? <Check size={14} style={{ color: 'var(--ora-success)' }} /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        </div>

        {/* 2FA Status */}
        <div
          className="p-3.5 rounded-xl border flex items-center justify-between"
          style={{
            background: 'var(--surface-container)',
            borderColor: 'var(--glass-border)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <ShieldCheck size={16} style={{ color: 'var(--ora-success)' }} />
            <div>
              <p className="font-bold text-foreground">Two-Factor Authentication (2FA)</p>
              <p className="text-[11px] text-muted-foreground">Enabled via Authenticator App</p>
            </div>
          </div>
          <span
            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border"
            style={{
              background: 'color-mix(in srgb, var(--ora-success) 12%, transparent)',
              borderColor: 'color-mix(in srgb, var(--ora-success) 25%, transparent)',
              color: 'var(--ora-success)',
            }}
          >
            Active
          </span>
        </div>
      </div>
    </div>
  );
}
