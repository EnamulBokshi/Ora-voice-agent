/**
 * Single source of truth for what an agent may do on a given site.
 *
 * Both the system instruction and the Gemini tool declarations are derived
 * from here, so the prompt can never describe a capability the model was not
 * given, or withhold one it was.
 *
 * The rule is evidence-first: commerce behaviour is switched on by a declared
 * `ecommerce` archetype or by an actual catalogue, never by an unrecognised
 * archetype falling through a chain of `if`s. A clinic, a restaurant, a school
 * or any archetype added later therefore starts from the conservative set.
 */

/** Archetypes that never sell from a catalogue, whatever else is ingested. */
export const NON_COMMERCE_ARCHETYPES = new Set([
  'saas',
  'portfolio',
  'agency_services',
  'consulting',
  'clinic_appointments',
]);

/** The archetype that always means retail. */
export const COMMERCE_ARCHETYPE = 'ecommerce';

/** ORA's own host agent on tryora.live. */
export const PLATFORM_ARCHETYPE = 'platform_saas';

/**
 * Tools every visitor-facing agent gets: answer from ingested knowledge,
 * remember the visitor, and capture a lead.
 */
export const BASE_TOOL_NAMES = [
  'capture_sales_lead',
  'search_knowledge_base',
  'get_store_policy',
  'update_customer_profile',
  'get_customer_profile',
  'navigate_to_page',
] as const;

/** Added only when the site actually sells from a catalogue. */
export const COMMERCE_TOOL_NAMES = [
  'find_products',
  'get_product_details',
  'add_to_cart',
  'get_cart',
  'update_cart_quantity',
  'navigate_to_page',
  'search_knowledge_base',
  'get_store_policy',
  'update_customer_profile',
  'get_customer_profile',
] as const;

/** ORA's own sales and onboarding agent. */
export const PLATFORM_TOOL_NAMES = [
  'get_pricing_plans',
  'capture_sales_lead',
  'get_integration_guide',
  'navigate_to_page',
  'search_knowledge_base',
  'update_agent_directives',
  'update_customer_profile',
  'get_customer_profile',
] as const;

export interface AgentCapabilityContext {
  /** The business's active agent profile, or undefined when unresolved. */
  archetype?: string;
  /** True only for ORA's own platform tenant. */
  isPlatform?: boolean;
  /** Whether this tenant has any products ingested. */
  hasCatalog?: boolean;
}

export interface AgentCapability {
  /** The archetype the agent should be treated as. */
  archetype: string;
  isPlatform: boolean;
  /** Whether catalogue, cart and checkout behaviour applies. */
  isCommerce: boolean;
  /** Names of the tools to declare, in declaration order. */
  toolNames: string[];
}

export function resolveAgentCapability(
  context: AgentCapabilityContext,
): AgentCapability {
  const archetype = (context.archetype || 'general').trim();
  const isPlatform = context.isPlatform === true || archetype === PLATFORM_ARCHETYPE;

  if (isPlatform) {
    return {
      archetype: PLATFORM_ARCHETYPE,
      isPlatform: true,
      isCommerce: false,
      toolNames: [...PLATFORM_TOOL_NAMES],
    };
  }

  // Declared retail, or an unclassified site that demonstrably has a
  // catalogue. An archetype that states it does not sell is never overridden
  // by stray ingested products.
  const isCommerce =
    archetype === COMMERCE_ARCHETYPE ||
    (context.hasCatalog === true && !NON_COMMERCE_ARCHETYPES.has(archetype));

  return {
    archetype,
    isPlatform: false,
    isCommerce,
    toolNames: isCommerce ? [...COMMERCE_TOOL_NAMES] : [...BASE_TOOL_NAMES],
  };
}

/**
 * When to reach for each tool, phrased for the system instruction. The prompt
 * lists only the tools that were actually declared, so a rule can never
 * advertise a function the model does not have.
 */
export const TOOL_USAGE_HINTS: Record<string, string> = {
  find_products:
    '   - find_products: When the visitor asks for a specific item, category, or price range.',
  get_product_details:
    '   - get_product_details: When the visitor asks for specific details or a full description of an item.',
  add_to_cart:
    '   - add_to_cart: When the visitor asks to add an item to their cart.',
  capture_sales_lead:
    '   - capture_sales_lead: When the visitor shares their name, email, phone, or requirements for follow-up.',
  search_knowledge_base:
    "   - search_knowledge_base: When the visitor asks about anything covered by this business's own documents and FAQs.",
  get_store_policy:
    '   - get_store_policy: When the visitor asks about terms, privacy, returns, or another published policy.',
  update_customer_profile:
    '   - update_customer_profile: When the visitor shares their name, contact details, or preferences.',
  get_customer_profile:
    '   - get_customer_profile: When the visitor asks what details you have saved for them.',
  navigate_to_page:
    '   - navigate_to_page: When the visitor asks to be taken to a page that exists on this site. Always say one short sentence naming where you are taking them first ("Taking you to our contact page now!") — the visitor is listening, so never move the page in silence.',
  get_pricing_plans:
    '   - get_pricing_plans: When the visitor asks about plans, pricing, or what a tier includes.',
  get_integration_guide:
    '   - get_integration_guide: When the visitor asks how to install or integrate ORA.',
  update_agent_directives:
    '   - update_agent_directives: When an authenticated owner asks you to remember new instructions.',
};

/** The usage hints for one capability, in declaration order, deduplicated. */
export function toolUsageHints(capability: AgentCapability): string[] {
  return capability.toolNames
    .map((name) => TOOL_USAGE_HINTS[name])
    .filter((hint): hint is string => !!hint);
}

