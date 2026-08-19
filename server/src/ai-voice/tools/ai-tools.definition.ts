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
      'Search website knowledge base, portfolio details, creator bio, projects, services, pricing, FAQs, contact info, and policies.',
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
];

