import {
  Briefcase,
  Building2,
  Globe,
  Handshake,
  Layers,
  ShoppingBag,
  Stethoscope,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * The single source of truth for business archetypes on the client.
 *
 * These ids must stay in sync with the `businessArchetype` enum on AgentConfig
 * (server/src/agent-config/schemas/agent-config.schema.ts). A value outside
 * that enum fails DTO validation on save.
 *
 * The archetype is an entity, not an attribute: a business owns one agent
 * profile per archetype, and switching archetypes switches the whole profile
 * (persona, prompt, voice, playbook and knowledge) rather than editing it.
 *
 * Only `ecommerce` turns on catalogue, cart and checkout behaviour — see
 * server/src/ai-voice/tools/archetype-capabilities.ts. Every other archetype
 * gets the knowledge and lead-capture agent, so pick the one that describes
 * the business rather than the closest retail label.
 */
export type BusinessArchetype =
  | 'ecommerce'
  | 'saas'
  | 'agency_services'
  | 'consulting'
  | 'clinic_appointments'
  | 'portfolio'
  | 'general';

export interface ArchetypeOption {
  id: BusinessArchetype;
  label: string;
  category: string;
  /** One-line description shown on archetype pickers. */
  blurb: string;
  Icon: LucideIcon;
  iconClass: string;
}

export const ARCHETYPES: readonly ArchetypeOption[] = [
  {
    id: 'ecommerce',
    label: 'E-Commerce Store',
    category: 'Retail',
    blurb: 'Physical & digital retail products with cart tools',
    Icon: ShoppingBag,
    iconClass: 'text-foreground',
  },
  {
    id: 'saas',
    label: 'SaaS Product',
    category: 'Software',
    blurb: 'Subscription software, API tiers & onboarding flows',
    Icon: Layers,
    iconClass: 'text-foreground',
  },
  {
    id: 'agency_services',
    label: 'Agency & Services',
    category: 'Services',
    blurb: 'Client consulting, project scoping & lead intake',
    Icon: Briefcase,
    iconClass: 'text-foreground',
  },
  {
    id: 'consulting',
    label: 'Consulting',
    category: 'Services',
    blurb: 'Advisory practices, discovery calls & proposal intake',
    Icon: Handshake,
    iconClass: 'text-foreground',
  },
  {
    id: 'clinic_appointments',
    label: 'Clinic & Appointments',
    category: 'Healthcare',
    blurb: 'Practices booking visits, triage & patient FAQs',
    Icon: Stethoscope,
    iconClass: 'text-foreground',
  },
  {
    id: 'portfolio',
    label: 'Creator & Portfolio',
    category: 'Personal',
    blurb: 'Creators, studios & personalized client demos',
    Icon: Globe,
    iconClass: 'text-foreground',
  },
  {
    id: 'general',
    label: 'Other',
    category: 'Other',
    blurb: 'Custom workflows, support & general business',
    Icon: Building2,
    iconClass: 'text-foreground',
  },
] as const;

export const DEFAULT_ARCHETYPE: BusinessArchetype = 'general';

const ARCHETYPE_IDS = ARCHETYPES.map((a) => a.id) as BusinessArchetype[];

/**
 * Legacy ids that predate the shared list. `agency` was used by the setup
 * guide while the server enum has always spelled it `agency_services`, so
 * bookmarked `?archetype=agency` links kept failing validation on save.
 */
const LEGACY_ARCHETYPE_ALIASES: Record<string, BusinessArchetype> = {
  agency: 'agency_services',
  clinic: 'clinic_appointments',
  persona: 'general',
};

export function isBusinessArchetype(value: unknown): value is BusinessArchetype {
  return typeof value === 'string' && ARCHETYPE_IDS.includes(value as BusinessArchetype);
}

/**
 * Normalises any stored, bookmarked or user-supplied value to a known
 * archetype id. Returns null when the value cannot be resolved, so callers
 * can distinguish "not chosen yet" from "defaulted to general".
 */
export function normalizeArchetype(value: unknown): BusinessArchetype | null {
  if (isBusinessArchetype(value)) return value;
  if (typeof value === 'string' && LEGACY_ARCHETYPE_ALIASES[value]) {
    return LEGACY_ARCHETYPE_ALIASES[value];
  }
  return null;
}

export function getArchetype(value: unknown): ArchetypeOption | null {
  const id = normalizeArchetype(value);
  return id ? ARCHETYPES.find((a) => a.id === id) ?? null : null;
}

export function getArchetypeLabel(value: unknown): string {
  return getArchetype(value)?.label ?? 'Not set';
}

/**
 * Archetypes that never sell from a catalogue, whatever else is ingested.
 * Mirrors NON_COMMERCE_ARCHETYPES in
 * server/src/ai-voice/tools/archetype-capabilities.ts — the two must agree, or
 * the dashboard offers a catalogue the agent was never given tools for.
 */
const NON_COMMERCE_ARCHETYPES = new Set<BusinessArchetype>([
  'saas',
  'portfolio',
  'agency_services',
  'consulting',
  'clinic_appointments',
]);

/** The archetype that always means retail. */
const COMMERCE_ARCHETYPE: BusinessArchetype = 'ecommerce';

/**
 * Whether catalogue surfaces (product sync, catalogue browsing) apply to this
 * business.
 *
 * Not every business has a product catalogue, so these surfaces are shown on
 * evidence rather than to everybody: a declared retail archetype, or an
 * unclassified business that demonstrably has products connected. An archetype
 * that states it does not sell is never overridden by stray ingested products.
 * This is the same rule the backend uses to decide whether the agent gets cart
 * and checkout tools at all.
 */
export function showsProductCatalog(context: {
  archetype?: unknown;
  hasCatalog?: boolean;
}): boolean {
  const archetype = normalizeArchetype(context.archetype) ?? DEFAULT_ARCHETYPE;
  if (archetype === COMMERCE_ARCHETYPE) return true;
  if (NON_COMMERCE_ARCHETYPES.has(archetype)) return false;
  return context.hasCatalog === true;
}

/**
 * Switching the active archetype changes which surfaces a business is offered —
 * most visibly the Product Catalog role, which `showsProductCatalog` gates on it.
 *
 * The dashboard sidebar and the agent workspace each read the business context
 * once on mount, so without a broadcast the switch is invisible to them until a
 * full page reload. Same window-CustomEvent pattern as `ora:setup-progress-changed`
 * in hooks/use-setup-progress.ts.
 */
export const ARCHETYPE_CHANGED_EVENT = 'ora:archetype-changed';

export function broadcastArchetypeChange(archetype: unknown) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(
    new CustomEvent(ARCHETYPE_CHANGED_EVENT, { detail: normalizeArchetype(archetype) }),
  );
}
