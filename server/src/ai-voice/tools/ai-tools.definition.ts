export const ORA_TOOL_DECLARATIONS = [
  {
    name: 'search_products',
    description:
      'Search the merchant product catalog for matching items based on user query, optional category, or maximum price.',
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
    name: 'check_inventory',
    description: 'Check real-time stock availability and inventory levels for a product.',
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
];
