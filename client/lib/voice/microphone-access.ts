'use client';

/**
 * Microphone access inside the embedded Shopify app.
 *
 * `getUserMedia` needs the `microphone` Permissions Policy delegated by every
 * frame from the top document down. Shopify Admin frames the app without
 * `allow="microphone"`, so the call is rejected before any prompt appears —
 * and a policy rejection is a `NotAllowedError`, exactly what a user denial
 * looks like. Nothing in the app can grant it; the only way to reach a
 * microphone is to leave the iframe.
 */

import { STANDALONE_VOICE_PATH } from '@/lib/navigation/embedded-routes';

const ID_TOKEN_TIMEOUT_MS = 8000;

/** Which half of the voice workspace the standalone tab opens on. */
export type StandaloneVoiceView = 'feed' | 'test';

/** True when this document is framed by another one. */
export function isFramed(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.top !== window.self;
  } catch {
    // A cross-origin parent throws on access, which is itself the answer.
    return true;
  }
}

/**
 * Whether the microphone is blocked by the frame's Permissions Policy.
 *
 * `document.permissionsPolicy` (`featurePolicy` in older Chrome) answers this
 * without prompting. Browsers without it fall back to the frame check: being
 * framed is not proof of a block, but inside Shopify Admin it always is, and
 * offering a new tab is harmless when the microphone would have worked.
 */
export function isMicrophoneBlockedByPolicy(): boolean {
  if (typeof document === 'undefined') return false;

  const policy =
    (document as any).permissionsPolicy ?? (document as any).featurePolicy;

  if (policy?.allowsFeature) {
    try {
      return !policy.allowsFeature('microphone');
    } catch {
      // allowsFeature throws on an unrecognized feature name in some builds.
    }
  }

  return isFramed();
}

/**
 * Opens the voice workspace in a top-level tab that can reach the microphone,
 * on its training (`feed`) or testing (`test`) half.
 *
 * The new tab is not framed, so the policy no longer applies. It carries a
 * fresh App Bridge session token on the URL because App Bridge only exists
 * inside Shopify Admin: `lib/session/shopify-session.ts` reads `id_token` from
 * the query string and exchanges it, which is the same path Shopify itself
 * uses on the first embedded load.
 *
 * Returns false when the token could not be minted or the browser blocked the
 * pop-up, so the caller can say so rather than appearing to do nothing.
 */
export async function openInStandaloneTab(
  view: StandaloneVoiceView = 'test',
): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  const target = new URL(STANDALONE_VOICE_PATH, window.location.origin);
  target.searchParams.set('view', view);

  const idToken = await mintSessionToken();
  if (!idToken) return false;

  // The token lives about a minute and is exchanged on load, so it is spent
  // by the time the address bar matters.
  target.searchParams.set('id_token', idToken);

  const opened = window.open(target.toString(), '_blank', 'noopener,noreferrer');
  return Boolean(opened);
}

async function mintSessionToken(): Promise<string | null> {
  const bridge = (window as any).shopify;
  if (!bridge?.idToken) return null;

  try {
    return await Promise.race([
      bridge.idToken() as Promise<string>,
      new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), ID_TOKEN_TIMEOUT_MS),
      ),
    ]);
  } catch {
    return null;
  }
}
