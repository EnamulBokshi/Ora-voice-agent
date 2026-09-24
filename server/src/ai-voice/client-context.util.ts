/**
 * Cleans the browsing context a voice client reports about its page.
 *
 * Every field here arrives from the visitor's browser — the WebSocket query
 * string at connect, `client_context_update` messages after — and parts of it
 * reach the model: the path, title and section go into the system instruction
 * at session start and into [PAGE_STATE] turns after. Anyone can open the
 * socket by hand, so these are untrusted text. Unbounded, a page "title" was a
 * way to write paragraphs of instructions into the system prompt.
 *
 * The rules keep what a real page produces and drop what only an injection
 * needs: newlines, brackets that imitate the prompt's own markers, and length.
 */

const MAX_PATH = 200;
const MAX_TITLE = 120;
const MAX_SECTION = 60;
const MAX_HISTORY = 10;
const MAX_ID = 120;

// Path characters a real URL path, query or fragment uses.
const PATH_DISALLOWED = /[^A-Za-z0-9/_\-.~%?=&#+:@,]/g;
// Control characters, and the brackets and angle quotes the prompt uses for its
// own markers ([PAGE_STATE], [SYSTEM_TRIGGER: ...]) and that markup would need.
const TEXT_DISALLOWED = /[\u0000-\u001f\u007f\[\]{}<>`]/g;

export function sanitizePath(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.trim().replace(PATH_DISALLOWED, '').slice(0, MAX_PATH);
  if (!cleaned) return undefined;
  return cleaned.startsWith('/') || cleaned.startsWith('#') ? cleaned : `/${cleaned}`;
}

export function sanitizeText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const cleaned = value.replace(TEXT_DISALLOWED, ' ').replace(/\s+/g, ' ').trim().slice(0, max).trim();
  return cleaned || undefined;
}

export interface RawClientContext {
  currentPath?: unknown;
  title?: unknown;
  history?: unknown;
  activeSection?: unknown;
  product?: unknown;
  selectedVariantId?: unknown;
  cartItemCount?: unknown;
  cartTotal?: unknown;
}

export interface SanitizedClientContext {
  currentPath?: string;
  title?: string;
  history?: string[];
  activeSection?: string;
  product?: { name?: string; sku?: string; id?: string; price?: string; currency?: string };
  selectedVariantId?: string;
  cartItemCount?: number;
  cartTotal?: number;
}

function sanitizeNumber(value: unknown): number | undefined {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n < 1e9 ? n : undefined;
}

export function sanitizeClientContext(raw: RawClientContext): SanitizedClientContext {
  const history = (
    Array.isArray(raw.history)
      ? raw.history
      : typeof raw.history === 'string'
        ? raw.history.split(',')
        : []
  )
    .map(sanitizePath)
    .filter((p): p is string => !!p)
    .slice(-MAX_HISTORY);

  let product: SanitizedClientContext['product'];
  if (raw.product && typeof raw.product === 'object') {
    const p = raw.product as Record<string, unknown>;
    // Ids and prices arrive as numbers from some storefronts; keep them as text.
    const asText = (v: unknown, max: number) =>
      sanitizeText(typeof v === 'number' && Number.isFinite(v) ? String(v) : v, max);
    product = {
      name: asText(p.name, MAX_TITLE),
      sku: asText(p.sku, MAX_ID),
      id: asText(p.id, MAX_ID),
      price: asText(p.price, 32),
      currency: asText(p.currency, 8),
    };
    if (!product.name && !product.sku && !product.id) product = undefined;
  }

  return {
    currentPath: sanitizePath(raw.currentPath),
    title: sanitizeText(raw.title, MAX_TITLE),
    history: history.length ? history : undefined,
    activeSection: sanitizeText(raw.activeSection, MAX_SECTION),
    product,
    selectedVariantId: sanitizeText(
      typeof raw.selectedVariantId === 'number' ? String(raw.selectedVariantId) : raw.selectedVariantId,
      MAX_ID,
    ),
    cartItemCount: sanitizeNumber(raw.cartItemCount),
    cartTotal: sanitizeNumber(raw.cartTotal),
  };
}
