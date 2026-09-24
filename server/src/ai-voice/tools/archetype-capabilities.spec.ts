import {
  resolveAgentCapability,
  toolUsageHints,
} from './archetype-capabilities';
import { getToolsForArchetype } from './ai-tools.definition';

describe('resolveAgentCapability', () => {
  const names = (archetype?: string, isPlatform = false, hasCatalog?: boolean) =>
    getToolsForArchetype(archetype, isPlatform, hasCatalog).map((t) => t.name);

  describe('commerce is opt-in, never a fallback', () => {
    it('gives an unrecognised archetype the conservative tool set', () => {
      const tools = names('restaurant');

      expect(tools).toContain('capture_sales_lead');
      expect(tools).toContain('search_knowledge_base');
      expect(tools).not.toContain('add_to_cart');
      expect(tools).not.toContain('place_order');
      expect(tools).not.toContain('redirect_to_checkout');
      expect(tools).not.toContain('find_products');
    });

    it('does not hand a clinic a cart or a checkout', () => {
      const tools = names('clinic_appointments');

      expect(tools).toContain('capture_sales_lead');
      expect(tools).not.toContain('add_to_cart');
      expect(tools).not.toContain('redirect_to_checkout');
    });

    it('keeps a declared non-commerce archetype conservative even with a catalogue', () => {
      for (const archetype of [
        'saas',
        'portfolio',
        'agency_services',
        'consulting',
        'clinic_appointments',
      ]) {
        const tools = names(archetype, false, true);
        expect(tools).not.toContain('add_to_cart');
        expect(tools).toContain('capture_sales_lead');
      }
    });

    it('turns commerce on for a declared ecommerce store with no catalogue yet', () => {
      expect(names('ecommerce', false, false)).toContain('find_products');
    });

    it('turns commerce on for an unclassified business that has a catalogue', () => {
      expect(names('general', false, true)).toContain('find_products');
      expect(names(undefined, false, true)).toContain('find_products');
    });

    it('leaves an unclassified business with no catalogue conservative', () => {
      expect(names('general', false, false)).not.toContain('find_products');
      expect(names(undefined)).not.toContain('find_products');
    });
  });

  describe('every non-retail archetype can capture a lead', () => {
    it.each([
      'general',
      'saas',
      'portfolio',
      'agency_services',
      'consulting',
      'clinic_appointments',
      'unrecognised_vertical',
    ])('%s has capture_sales_lead', (archetype) => {
      expect(names(archetype)).toContain('capture_sales_lead');
    });
  });

  describe('platform boundary', () => {
    it('keeps platform tools off merchant agents', () => {
      const merchant = names('ecommerce');
      expect(merchant).not.toContain('get_pricing_plans');
      expect(merchant).not.toContain('get_integration_guide');
      expect(merchant).not.toContain('update_agent_directives');
    });

    it('keeps merchant commerce tools off the platform agent', () => {
      const platform = names('general', true, true);
      expect(platform).toContain('get_pricing_plans');
      expect(platform).not.toContain('add_to_cart');
      expect(platform).not.toContain('find_products');
    });

    it('never exposes update_agent_directives to a visitor-facing agent', () => {
      // The platform agent is visitor-facing too: it serves the public on tryora.live.
      expect(names('general', true, true)).not.toContain('update_agent_directives');
      for (const archetype of [
        'general',
        'ecommerce',
        'saas',
        'portfolio',
        'agency_services',
        'consulting',
        'clinic_appointments',
      ]) {
        expect(names(archetype, false, true)).not.toContain(
          'update_agent_directives',
        );
      }
    });
  });

  describe('prompt and declarations cannot disagree', () => {
    it.each([
      ['ecommerce', false, true],
      ['general', false, false],
      ['clinic_appointments', false, true],
      ['unknown_vertical', false, false],
      ['general', true, true],
    ] as const)(
      'every hint for %s names a declared tool',
      (archetype, isPlatform, hasCatalog) => {
        const capability = resolveAgentCapability({
          archetype,
          isPlatform,
          hasCatalog,
        });
        const declared = names(archetype, isPlatform, hasCatalog);
        const hints = toolUsageHints(capability);

        expect(hints.length).toBeGreaterThan(0);
        for (const hint of hints) {
          const toolName = hint.trim().split(':')[0].replace('- ', '').trim();
          expect(declared).toContain(toolName);
        }
      },
    );

    it('never hints at a commerce tool on a non-commerce site', () => {
      const capability = resolveAgentCapability({
        archetype: 'clinic_appointments',
        hasCatalog: true,
      });
      const hints = toolUsageHints(capability).join('\n');

      expect(hints).not.toContain('add_to_cart');
      expect(hints).not.toContain('redirect_to_checkout');
      expect(hints).not.toContain('find_products');
      expect(hints).toContain('capture_sales_lead');
    });
  });

  describe('apply_coupon placement', () => {
    it("is offered on ORA's own platform agent", () => {
      expect(names('platform', true)).toContain('apply_coupon');
    });

    it('is not offered to merchant storefront agents', () => {
      // Storefront discount codes belong to the merchant's own checkout, not to
      // ORA's subscription coupons, so a merchant agent must not carry this tool.
      expect(names('retail', false, true)).not.toContain('apply_coupon');
      expect(names('clinic')).not.toContain('apply_coupon');
      expect(names('portfolio')).not.toContain('apply_coupon');
      expect(names('saas')).not.toContain('apply_coupon');
    });

    it('explains itself in the prompt only where it is declared', () => {
      const platformHints = toolUsageHints(
        resolveAgentCapability({ archetype: 'platform', isPlatform: true }),
      ).join('\n');
      const retailHints = toolUsageHints(
        resolveAgentCapability({ archetype: 'retail', hasCatalog: true }),
      ).join('\n');

      expect(platformHints).toContain('Never invent a code');
      expect(retailHints).not.toContain('apply_coupon');
    });
  });
});
