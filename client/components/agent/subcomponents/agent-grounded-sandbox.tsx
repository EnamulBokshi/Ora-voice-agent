'use client';

import { useState } from 'react';
import { MessageSquare, BookOpen, Sparkles, Send } from 'lucide-react';
import { KnowledgeItem } from '../agent-types';

interface AgentGroundedSandboxProps {
  item: KnowledgeItem;
}

export function AgentGroundedSandbox({ item }: AgentGroundedSandboxProps) {
  const [testQuery, setTestQuery] = useState<string>('');
  const [simulatedAnswer, setSimulatedAnswer] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const handleRunSimulation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testQuery.trim()) return;

    setIsSimulating(true);
    setTimeout(() => {
      setSimulatedAnswer(
        `Based on your ${item.title}, ORA will answer: ${
          testQuery.toLowerCase().includes('delivery') || testQuery.toLowerCase().includes('dhaka')
            ? 'Inside Dhaka delivery takes 1-2 business days for ৳60 via Pathao/RedX. Outside Dhaka takes 3-5 days for ৳120.'
            : testQuery.toLowerCase().includes('return')
            ? 'Returns are allowed within 7 days hassle-free as long as the original product tags and packaging are intact.'
            : `ORA relies directly on your ${item.title} to answer customer questions accurately.`
        }`
      );
      setIsSimulating(false);
    }, 600);
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
        <MessageSquare size={13} /> Test ORA AI Assistant (Live Preview)
      </h3>

      <div
        className="rounded-2xl p-4 border flex flex-col gap-3 relative overflow-hidden"
        style={{
          background: 'color-mix(in srgb, var(--primary) 8%, var(--surface-container))',
          borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
        }}
      >
        {/* Default Simulation Preset */}
        <div className="flex justify-end">
          <div
            className="rounded-2xl rounded-tr-xs p-3 text-xs text-foreground max-w-[85%]"
            style={{
              background: 'var(--surface-high)',
              border: '1px solid var(--glass-border)',
            }}
          >
            <p>{item.groundingSimulation.question}</p>
          </div>
        </div>

        <div className="flex justify-start items-start gap-2.5 mt-1">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-md border"
            style={{
              background: 'var(--logo-gradient)',
              color: 'var(--logo-text)',
              borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)',
            }}
          >
            O
          </div>
          <div
            className="rounded-2xl rounded-tl-xs p-3.5 text-xs text-foreground max-w-[85%] border shadow-sm space-y-2"
            style={{
              background: 'color-mix(in srgb, var(--primary) 10%, transparent)',
              borderColor: 'color-mix(in srgb, var(--primary) 25%, transparent)',
            }}
          >
            <p className="leading-relaxed">{item.groundingSimulation.answer}</p>
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold border"
              style={{
                background: 'color-mix(in srgb, var(--primary) 15%, transparent)',
                borderColor: 'color-mix(in srgb, var(--primary) 30%, transparent)',
                color: 'var(--primary)',
              }}
            >
              <BookOpen size={11} /> Source Policy: {item.groundingSimulation.sourceTag}
            </div>
          </div>
        </div>

        {/* Dynamic Simulation Output if user types */}
        {simulatedAnswer && (
          <div className="flex justify-start items-start gap-2.5 mt-2 border-t pt-3" style={{ borderColor: 'var(--glass-border)' }}>
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-md border"
              style={{
                background: 'var(--logo-gradient)',
                color: 'var(--logo-text)',
              }}
            >
              O
            </div>
            <div
              className="rounded-2xl p-3 text-xs text-foreground border space-y-2"
              style={{
                background: 'color-mix(in srgb, var(--secondary) 12%, transparent)',
                borderColor: 'color-mix(in srgb, var(--secondary) 25%, transparent)',
              }}
            >
              <p>{simulatedAnswer}</p>
              <span className="text-[10px] text-[var(--secondary)] font-bold flex items-center gap-1">
                <Sparkles size={11} /> Verified Store Response
              </span>
            </div>
          </div>
        )}

        {/* Interactive Prompt Input Box */}
        <form onSubmit={handleRunSimulation} className="relative mt-2">
          <input
            type="text"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            placeholder="Test customer question (e.g. Can I return after 5 days?)..."
            className="w-full bg-[var(--surface-high)] border rounded-xl py-2 pl-3.5 pr-10 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[var(--primary)] transition-colors"
            style={{ borderColor: 'var(--glass-border)' }}
          />
          <button
            type="submit"
            disabled={isSimulating}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-white transition-opacity"
            style={{ background: 'var(--primary)' }}
          >
            <Send size={13} />
          </button>
        </form>
      </div>
    </div>
  );
}
