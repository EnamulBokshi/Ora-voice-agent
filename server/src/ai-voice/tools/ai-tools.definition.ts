import { resolveAgentCapability } from './archetype-capabilities';

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
    description: 'Retrieve full details, pricing, images, and description for a specific product by ID, handle, or name.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productId: {
          type: 'STRING',
          description: 'The product ID, Shopify numeric ID, product handle / slug (e.g. "apex-minimalist-bomber-jacket"), or "current" for the current page item.',
        },
        productName: {
          type: 'STRING',
          description: 'Optional product title or name if productId is not known.',
        },
      },
    },
  },
  {
    name: 'add_to_cart',
    description:
      'Add a specified product and quantity to the customer shopping cart. Can be specified by productId, handle, or productName. If the customer mentions an option (size, color, style), pass it in variantOption to add it immediately.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productId: {
          type: 'STRING',
          description: 'The product ID, Shopify numeric ID, product handle / slug (e.g. "apex-minimalist-bomber-jacket"), or "current" to add the item from the current product page.',
        },
        productName: {
          type: 'STRING',
          description: 'Optional product name if referring to an item by name (e.g. "Apex Minimalist Bomber Jacket").',
        },
        quantity: {
          type: 'NUMBER',
          description: 'Number of items to add (default 1).',
        },
        variantOption: {
          type: 'STRING',
          description:
            'Optional specific option name, size, color, or style spoken by customer (e.g. "Medium", "Matte Black", "Medium / Matte Black").',
        },
        variantId: {
          type: 'STRING',
          description:
            'Optional variant ID if already known. Omit if customer specified an option name in variantOption.',
        },
      },
    },
  },
  {
    name: 'get_cart',
    description:
      'Retrieve all items, quantities, unit prices, line item totals, and grand total currently in the customer’s shopping cart. Call this whenever the customer asks what is in their cart, asks for cart totals, or asks to review their order.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'update_cart_quantity',
    description:
      'Update the quantity of an item in the customer’s shopping cart, or remove it completely. Use this when the customer asks to decrease, increase, change quantity, or remove/delete an item.',
    parameters: {
      type: 'OBJECT',
      properties: {
        productName: {
          type: 'STRING',
          description:
            'The name or title of the product to update (e.g. "Botanical Restorative Facial Serum", "Cyber-Shades").',
        },
        variantId: {
          type: 'STRING',
          description: 'Optional variant ID of the item if already known.',
        },
        quantity: {
          type: 'NUMBER',
          description:
            'The target quantity (set to 0 to remove the item from cart). If the user says "decrease by 1" and current quantity is 2, pass quantity: 1 or use delta.',
        },
        delta: {
          type: 'NUMBER',
          description:
            'Optional relative quantity change (e.g. -1 to decrease by one, +1 to increase by one).',
        },
      },
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
      'Save or update the customer name, email, phone, shipping address, or extracted preferences into persistent memory and trigger on-screen verification whenever the customer introduces themselves or shares contact/delivery info.',
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
        address: {
          type: 'STRING',
          description: 'The shipping or delivery address if provided by customer.',
        },
        preferences: {
          type: 'OBJECT',
          description: 'Key-value preferences or interests extracted from conversation.',
        },
      },
    },
  },
  {
    name: 'get_customer_profile',
    description:
      'Retrieve the active customer profile, name, verified email, phone number, shipping address, and preferences currently stored in memory or database. Call this whenever the user asks what details, email, phone, or name you have saved for them.',
    parameters: {
      type: 'OBJECT',
      properties: {},
    },
  },
  {
    name: 'get_pricing_plans',
    description:
      'Retrieve subscription pricing plans and tier limits for the ORA Platform SaaS.',
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
    name: 'apply_coupon',
    description:
      'Apply a coupon, promo, or discount code the visitor already has to their ORA subscription checkout. Only ever passes a code the visitor said out loud or one published by ORA — it can never create, invent, or generate a code, and it does not decide the discount: the server prices it.',
    parameters: {
      type: 'OBJECT',
      properties: {
        couponCode: {
          type: 'STRING',
          description:
            'The coupon code exactly as the visitor gave it (e.g. "LAUNCH20", "SAVE10").',
        },
        planId: {
          type: 'STRING',
          description:
            'Optional plan the visitor is buying ("starter", "growth", "scale"). Defaults to the plan they are viewing.',
        },
      },
      required: ['couponCode'],
    },
  },
  {
    name: 'navigate_to_page',
    description:
      'Direct or scroll the visitor’s browser to a specific valid page or section. Use this when the visitor asks to navigate to docs, pricing, cart, checkout, collections, product pages, dashboard, create account, log in, view features, or go home.',
    parameters: {
      type: 'OBJECT',
      properties: {
        destination: {
          type: 'STRING',
          description:
            'The target route path or anchor hash (e.g. "/docs", "/pricing", "/dashboard", "/cart", "/collections/all", "/products/handle", "#features", "#testimonials", "#cta").',
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

export function getToolsForArchetype(
  archetype?: string,
  isPlatform: boolean = false,
  hasCatalog?: boolean,
) {
  const { toolNames } = resolveAgentCapability({
    archetype,
    isPlatform,
    hasCatalog,
  });

  // Preserve the declaration order of ORA_TOOL_DECLARATIONS.
  return ORA_TOOL_DECLARATIONS.filter((t) => toolNames.includes(t.name));
}
