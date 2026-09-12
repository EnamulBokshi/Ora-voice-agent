'use client';

import React, { useSyncExternalStore } from 'react';
import { ExternalLink, ShieldCheck, ToggleRight } from 'lucide-react';

/**
 * The embedded app's answer to "how do I put the widget on my storefront".
 *
 * There is nothing to copy. The theme app extension
 * (`packages/shopify-app/extensions/ora-voice-widget`) ships with the app and
 * already knows the store's publishable key, because the server writes it into
 * an app-owned metafield at install. The merchant switches the embed on and is
 * finished.
 *
 * This replaces the paste-into-theme.liquid snippet inside `/shopify` only.
 * Editing theme code is still the right instruction for a standalone merchant,
 * so `IntegrationPreview` keeps it for every other surface.
 */

/**
 * Identifies the published theme app extension in a theme editor deep link.
 *
 * Shopify assigns this UUID when the extension is first deployed, so it cannot
 * be known at build time on a fresh app. Without it the link still opens the
 * App embeds panel, which is one click short rather than broken — so a missing
 * value is not treated as an error.
 */
const THEME_EXTENSION_ID = process.env.NEXT_PUBLIC_SHOPIFY_THEME_EXTENSION_ID || '';

const BLOCK_HANDLE = 'ora_widget';

function storeHandle(): string | null {
  if (typeof window === 'undefined') return null;

  const shop = new URLSearchParams(window.location.search).get('shop');
  if (!shop) return null;

  return shop.replace('.myshopify.com', '') || null;
}

function themeEditorUrl(handle: string | null): string | null {
  if (!handle) return null;

  const base = `https://admin.shopify.com/store/${handle}/themes/current/editor`;
  const params = new URLSearchParams({ context: 'apps' });

  if (THEME_EXTENSION_ID) {
    // Opens the panel with ORA's embed already selected and expanded.
    params.set('template', 'index');
    params.set('activateAppId', `${THEME_EXTENSION_ID}/${BLOCK_HANDLE}`);
  }

  return `${base}?${params.toString()}`;
}

/**
 * The link never changes for the life of the page, so it is resolved once and
 * cached. `useSyncExternalStore` requires a snapshot that is stable under
 * `Object.is`; rebuilding the string on every call would loop.
 */
let cachedUrl: string | null | undefined;

function urlSnapshot(): string | null {
  if (cachedUrl === undefined) cachedUrl = themeEditorUrl(storeHandle());
  return cachedUrl;
}

/** `location` does not exist during the server render. */
const serverUrlSnapshot = (): string | null => null;

const neverChanges = () => () => {};

export function ShopifyEmbedCard({ isWidgetActive = true }: { isWidgetActive?: boolean }) {
  const url = useSyncExternalStore(neverChanges, urlSnapshot, serverUrlSnapshot);

  const open = () => {
    if (!url || typeof window === 'undefined') return;
    // `_top`: the theme editor cannot be framed inside the app's iframe.
    window.open(url, '_top');
  };

  return (
    <div className="space-y-4 rounded-xl border border-border bg-surface-container p-5">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ToggleRight className="h-4 w-4" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">
            Turn on the ORA app embed
          </h3>
          <p className="text-sm text-muted-foreground">
            Your store&apos;s key is already installed, so there is no code to copy and
            no theme file to edit. Switch{' '}
            <span className="font-medium text-foreground">ORA Voice AI</span> on under
            App embeds and save.
          </p>
        </div>
      </div>

      <ol className="space-y-2 border-l border-border pl-4 text-sm text-muted-foreground">
        <li>Open your live theme in the theme editor.</li>
        <li>
          Go to <span className="font-medium text-foreground">App embeds</span> in the
          left sidebar.
        </li>
        <li>
          Toggle <span className="font-medium text-foreground">ORA Voice AI</span> on,
          then <span className="font-medium text-foreground">Save</span>.
        </li>
      </ol>

      <button
        type="button"
        onClick={open}
        disabled={!url}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        Open theme editor
        <ExternalLink className="h-3.5 w-3.5" />
      </button>

      {!url && (
        <p className="text-xs text-muted-foreground">
          Open this page from Shopify Admin to get a direct link. Otherwise go to
          Online Store → Themes → Customize → App embeds.
        </p>
      )}

      {!isWidgetActive && (
        <p className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-foreground">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          The widget is currently disabled in your ORA settings, so it stays hidden on
          the storefront even with the embed switched on.
        </p>
      )}
    </div>
  );
}
