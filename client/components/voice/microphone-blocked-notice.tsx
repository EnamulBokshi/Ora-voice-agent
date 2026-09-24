'use client';

import React, { useState } from 'react';
import { ExternalLink, MicOff } from 'lucide-react';

import { openInStandaloneTab, type StandaloneVoiceView } from '@/lib/voice/microphone-access';

/**
 * Shown in place of the voice controls when the microphone is unreachable.
 *
 * Shopify Admin frames the app without delegating the `microphone` Permissions
 * Policy, so `getUserMedia` fails with a `NotAllowedError` before any prompt.
 * The app cannot grant itself the permission — the only route to a microphone
 * is a top-level tab.
 */
export function MicrophoneBlockedNotice({
  className,
  view = 'test',
}: {
  className?: string;
  /** Which half of the voice workspace the new tab opens on. */
  view?: StandaloneVoiceView;
}) {
  const [state, setState] = useState<'idle' | 'opening' | 'failed'>('idle');
  const activity = view === 'feed' ? 'Voice training' : 'Voice testing';

  const open = async () => {
    setState('opening');
    const opened = await openInStandaloneTab(view);
    setState(opened ? 'idle' : 'failed');
  };

  return (
    <div
      className={`w-full rounded-xl border border-border/60 bg-surface-container/50 px-4 py-3.5 flex flex-col gap-2.5 ${className || ''}`}
    >
      <div className="flex items-center gap-2">
        <MicOff size={14} className="text-muted-foreground flex-shrink-0" />
        <p className="text-[12.5px] font-medium text-foreground">
          Shopify Admin blocks microphone access
        </p>
      </div>

      <p className="text-[12px] text-muted-foreground leading-relaxed">
        {activity} needs a microphone, and Shopify does not grant one to apps
        running inside its admin frame. Open ORA in its own tab to talk to it —
        you stay signed in, and everything you teach ORA there applies here.
      </p>

      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={open}
          disabled={state === 'opening'}
          className="inline-flex items-center gap-1.5 h-8 px-3.5 rounded-md bg-foreground text-background font-semibold text-[12px] hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-60"
        >
          <ExternalLink size={12} />
          <span>
            {state === 'opening'
              ? 'Opening…'
              : view === 'feed'
                ? 'Open voice training in a new tab'
                : 'Open voice test in a new tab'}
          </span>
        </button>

        {state === 'failed' && (
          <span className="text-[11.5px] text-[color:var(--status-warning)]">
            The tab could not be opened. Allow pop-ups for this page and retry.
          </span>
        )}
      </div>
    </div>
  );
}
