/**
 * The business archetypes ORA can run as.
 *
 * The archetype is an entity, not an attribute: a business owns one agent
 * profile per archetype (persona, prompt, voice, playbook and knowledge), and
 * `Business.activeArchetype` names the profile currently serving traffic.
 * Switching archetypes switches profiles — nothing is overwritten or deleted,
 * so switching back restores the earlier setup intact.
 *
 * Only `ecommerce` turns on catalogue, cart and checkout behaviour — see
 * ai-voice/tools/archetype-capabilities.ts.
 *
 * The client mirrors this list in client/lib/archetypes.ts.
 */
export const BUSINESS_ARCHETYPES = [
  'ecommerce',
  'saas',
  'agency_services',
  'consulting',
  'clinic_appointments',
  'portfolio',
  'general',
] as const;

export type BusinessArchetype = (typeof BUSINESS_ARCHETYPES)[number];

export const DEFAULT_ARCHETYPE: BusinessArchetype = 'general';

/**
 * Ids that predate the shared list. The setup guide shipped `agency` while
 * the AgentConfig enum has always spelled it `agency_services`, so stored and
 * bookmarked values in either spelling have to resolve.
 */
const LEGACY_ARCHETYPE_ALIASES: Record<string, BusinessArchetype> = {
  agency: 'agency_services',
  clinic: 'clinic_appointments',
};

export function isBusinessArchetype(value: unknown): value is BusinessArchetype {
  return (
    typeof value === 'string' &&
    (BUSINESS_ARCHETYPES as readonly string[]).includes(value)
  );
}

/** Resolves any stored or supplied value to a known archetype, or null. */
export function normalizeArchetype(value: unknown): BusinessArchetype | null {
  if (isBusinessArchetype(value)) return value;
  if (typeof value === 'string' && LEGACY_ARCHETYPE_ALIASES[value]) {
    return LEGACY_ARCHETYPE_ALIASES[value];
  }
  return null;
}

/** Resolves to a usable archetype, falling back to the default. */
export function resolveArchetype(value: unknown): BusinessArchetype {
  return normalizeArchetype(value) ?? DEFAULT_ARCHETYPE;
}
