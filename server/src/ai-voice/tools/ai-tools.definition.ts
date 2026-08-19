export const ORA_TOOL_DECLARATIONS = [
  {
    name: 'find_products',
    description:
      'Search catalog for matching products with live-verified price, stock quantity, and availability status. Use this tool for product discovery.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Search terms or product keywords requested by customer.',
        },
        category: {
          type: 'STRING',
          description: 'Optional product category filter.',
        },
        maxPrice: {
          type: 'NUMBER',
          description: 'Optional maximum price limit.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_product_details',
    description: 'Retrieve full details, pricing, images, and description for a specific product ID.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productId: {
          type: 'STRING',
          description: 'The unique MongoDB product ID.',
        },
      },
      required: ['productId'],
    },
  },
  {
    name: 'add_to_cart',
    description: 'Add a specified product and quantity to the customer session shopping cart.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productId: {
          type: 'STRING',
          description: 'The product ID to add.',
        },
        quantity: {
          type: 'NUMBER',
          description: 'Number of items to add.',
        },
      },
      required: ['productId'],
    },
  },
  {
    name: 'place_order',
    description:
      'Complete order placement for all items currently in the customer shopping cart (Tier 1 integrated merchants).',
    parameters: {
      type: 'OBJECT',
      properties: {
        shippingAddress: {
          type: 'STRING',
          description: 'Optional customer shipping address.',
        },
      },
    },
  },
  {
    name: 'redirect_to_checkout',
    description:
      'Generate a direct link to the merchant storefront checkout page (Tier 2-4 merchants).',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'search_knowledge_base',
    description:
      'Search external knowledge base for specific technical or company documentation NOT already present in your preloaded memory. If the information is in memory, answer immediately without calling this tool.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Search query or question about the portfolio, projects, bio, company, services, or policies.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_store_policy',
    description: 'Lookup store policies, FAQs, shipping rules, return procedures, or brand information.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Question or policy keyword to lookup.',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'update_customer_profile',
    description:
      'Save or update the customer name, email, phone, or extracted preferences (e.g. name, favorite color, size, budget) into persistent memory whenever the customer introduces themselves or shares preferences.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: {
          type: 'STRING',
          description: 'The full name or first name of the customer (e.g. "Enamul").',
        },
        email: {
          type: 'STRING',
          description: 'The email address of the customer if provided.',
        },
        phone: {
          type: 'STRING',
          description: 'The phone number of the customer if provided.',
        },
        preferences: {
          type: 'OBJECT',
          description: 'Key-value preferences or interests extracted from conversation.',
        },
      },
    },
  },
  {
    name: 'get_pricing_plans',
    description:
      'Retrieve subscription tiers from database. NOTE: If pricing plans ($29 Starter, $99 Growth, $299 Scale) are already in your preloaded memory, speak them directly without calling this tool to maintain sub-400ms latency.',
    parameters: {
      type: 'OBJECT',
      properties: {
        currency: {
          type: 'STRING',
          description: 'Optional currency preference ("USD" or "BDT").',
        },
      },
    },
  },
  {
    name: 'navigate_to_page',
    description:
      'Direct or scroll the visitor’s browser to a specific valid page or section from the application sitemap. Use this when the visitor asks to navigate to dashboard, pricing, create an account, log in, view features, or go home.',
    parameters: {
      type: 'OBJECT',
      properties: {
        destination: {
          type: 'STRING',
          description: 'The target route path or anchor hash. Must be one of the enumerated valid application routes.',
          enum: [
            '/',
            '/pricing',
            '/auth?mode=register',
            '/auth?mode=login',
            '/auth?mode=login&from=/dashboard',
            '/auth?mode=register&from=/dashboard',
            '/dashboard',
            '/live-desk',
            '/conversations',
            '/agent',
            '/customers',
            '/billing',
            '/profile',
            '/admin',
            '#features',
            '#stats',
            '#cta',
          ],
        },
        reason: {
          type: 'STRING',
          description: 'Brief explanation of why we are navigating or scrolling to this section.',
        },
      },
      required: ['destination'],
    },
  },
  {
    name: 'capture_sales_lead',
    description:
      'Record a prospective customer or merchant lead details (name, email, phone, company/store URL, interested tier, notes) into the database for sales follow-up.',
    parameters: {
      type: 'OBJECT',
      properties: {
        name: {
          type: 'STRING',
          description: 'The prospect or merchant contact name.',
        },
        email: {
          type: 'STRING',
          description: 'The prospect email address.',
        },
        phone: {
          type: 'STRING',
          description: 'Optional phone number.',
        },
        storeUrl: {
          type: 'STRING',
          description: 'The prospect current store URL, company website, or portfolio domain.',
        },
        interestedPlan: {
          type: 'STRING',
          description: 'The plan or tier the prospect expressed interest in (e.g. "starter", "growth", "enterprise").',
        },
        notes: {
          type: 'STRING',
          description: 'Any additional notes or custom requirements mentioned by the prospect.',
        },
      },
      required: ['email'],
    },
  },
  {
    name: 'get_integration_guide',
    description:
      'Get step-by-step setup instructions and code snippets for integrating ORA into Shopify, WooCommerce, Next.js/React, or vanilla HTML.',
    parameters: {
      type: 'OBJECT',
      properties: {
        platform: {
          type: 'STRING',
          description: 'Target platform: "shopify", "woocommerce", "nextjs", "react", or "html".',
        },
      },
      required: ['platform'],
    },
  },
  {
    name: 'update_agent_directives',
    description:
      'Persist or update custom merchant directives, brand voice rules, portfolio instructions, or sales priorities during onboarding or voice setup.',
    parameters: {
      type: 'OBJECT',
      properties: {
        directives: {
          type: 'STRING',
          description: 'The updated instructions, focus areas, or rules specified by the owner.',
        },
        brandVoice: {
          type: 'STRING',
          description: 'Optional updated tone of voice description.',
        },
      },
      required: ['directives'],
    },
  },
];

export function getToolsForArchetype(archetype?: string) {
  if (archetype === 'portfolio' || archetype === 'agency_services' || archetype === 'consulting') {
    // Exclude e-commerce shopping cart and direct order placement tools on non-e-commerce sites
    return ORA_TOOL_DECLARATIONS.filter(
      (t) => !['add_to_cart', 'place_order', 'redirect_to_checkout', 'find_products', 'get_product_details'].includes(t.name),
    );
  }
  if (archetype === 'saas') {
    // For SaaS platform sites, exclude physical ecommerce catalog and checkout tools
    return ORA_TOOL_DECLARATIONS.filter(
      (t) => !['add_to_cart', 'place_order', 'redirect_to_checkout', 'find_products', 'get_product_details', 'get_store_policy'].includes(t.name),
    );
  }
  return ORA_TOOL_DECLARATIONS;
}


