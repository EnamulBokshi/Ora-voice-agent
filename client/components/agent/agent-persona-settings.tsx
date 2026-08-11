'use client';

import { useState } from 'react';
import { Sliders, Mic, Sparkles, Languages, Volume2, ShieldCheck, Zap, Bot } from 'lucide-react';

export function AgentPersonaSettings() {
  const [toneVal, setToneVal] = useState<number>(75);
  const [speedVal, setSpeedVal] = useState<number>(50);
  const [banglishSupport, setBanglishSupport] = useState<boolean>(true);
  const [systemPrompt, setSystemPrompt] = useState<string>(
    'You are ORA, an elite enterprise sales AI assistant. Always greet customers cordially, recommend optimal products based on context, verify stock in real time, and assist with checkout.'
  );

  return (
    <div
      className="flex-1 rounded-2xl border p-6 flex flex-col gap-6 backdrop-blur-xl overflow-y-auto"
      style={{
        background: 'var(--glass-bg)',
        borderColor: 'var(--glass-border)',
      }}
    >
      <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--glass-border)' }}>
        <div>
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Sliders size={18} style={{ color: 'var(--primary)' }} />
            ORA Agent Voice & Persona Configuration
          </h3>
          <p className="text-xs text-muted-foreground">
            Tune speech characteristics, system instructions, and multi-lingual behavior.
          </p>
        </div>

        <button
          className="px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md hover:opacity-90 transition-opacity"
          style={{ background: 'var(--logo-gradient)' }}
        >
          Save Agent Persona
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Voice Synthesis & Sliders */}
        <div className="space-y-5">
          <div
            className="p-4 rounded-2xl border space-y-4"
            style={{
              background: 'var(--surface-container)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Mic size={14} style={{ color: 'var(--secondary)' }} /> Voice Synthesis Engine
            </h4>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-muted-foreground font-semibold block mb-1">Voice Latency & Model</label>
                <select
                  className="w-full bg-[var(--surface-high)] border rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:border-[var(--primary)]"
                  style={{ borderColor: 'var(--glass-border)' }}
                >
                  <option>ORA Crystal-Voice v2.4 (Ultra-Low Latency 180ms)</option>
                  <option>ORA Expressive Warmth v1.9 (220ms)</option>
                  <option>Standard Multilingual Neural (300ms)</option>
                </select>
              </div>

              {/* Tone Slider */}
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">Sales Enthusiasm & Tone</span>
                  <span className="text-foreground font-mono">{toneVal}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={toneVal}
                  onChange={(e) => setToneVal(Number(e.target.value))}
                  className="w-full accent-[var(--primary)]"
                />
              </div>

              {/* Speed Slider */}
              <div className="space-y-1">
                <div className="flex justify-between font-semibold">
                  <span className="text-muted-foreground">Speech Pace / Speed</span>
                  <span className="text-foreground font-mono">{speedVal}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={speedVal}
                  onChange={(e) => setSpeedVal(Number(e.target.value))}
                  className="w-full accent-[var(--secondary)]"
                />
              </div>
            </div>
          </div>

          {/* Language Code-Switching */}
          <div
            className="p-4 rounded-2xl border space-y-3"
            style={{
              background: 'var(--surface-container)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Languages size={14} style={{ color: 'var(--ora-success)' }} /> Code-Switching & Dialect
            </h4>

            <div className="flex items-center justify-between text-xs p-2.5 rounded-xl border bg-[var(--surface-high)]" style={{ borderColor: 'var(--glass-border)' }}>
              <div>
                <p className="font-bold text-foreground">Banglish Code-Switching</p>
                <p className="text-[11px] text-muted-foreground">Seamless English + Bengali sales conversation</p>
              </div>
              <input
                type="checkbox"
                checked={banglishSupport}
                onChange={(e) => setBanglishSupport(e.target.checked)}
                className="w-4 h-4 accent-[var(--primary)] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right Column: System Directives */}
        <div className="space-y-5">
          <div
            className="p-4 rounded-2xl border space-y-3 h-full flex flex-col"
            style={{
              background: 'var(--surface-container)',
              borderColor: 'var(--glass-border)',
            }}
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
              <Bot size={14} style={{ color: 'var(--primary)' }} /> System Prompt Instructions
            </h4>

            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={8}
              className="w-full bg-[var(--surface-high)] border rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--primary)] leading-relaxed font-mono resize-none flex-1"
              style={{ borderColor: 'var(--glass-border)' }}
            />

            <div
              className="p-3 rounded-xl border text-[11px] text-muted-foreground flex items-center gap-2"
              style={{
                background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
                borderColor: 'color-mix(in srgb, var(--primary) 20%, transparent)',
              }}
            >
              <Sparkles size={13} style={{ color: 'var(--primary)' }} />
              System directives automatically ground ORA's responses against your uploaded Knowledge Base.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
