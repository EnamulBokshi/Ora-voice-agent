import { KnowledgeItem, UploadedDoc } from './agent-types';

export const MOCK_KNOWLEDGE_ITEMS: KnowledgeItem[] = [
  {
    id: 'kb-1',
    title: 'Shipping Policy',
    category: 'Shipping & Delivery',
    status: 'active',
    usesCount: 142,
    lastEdited: 'Oct 24, 2023 by Admin',
    previewContent: {
      heading: 'Standard Delivery Policy',
      description:
        'We aim to deliver all orders as quickly and efficiently as possible. Below are the standard rates and times based on location.',
      sections: [
        {
          title: 'Inside Dhaka',
          items: [
            'Delivery Charge: ৳60',
            'Estimated Time: 1 - 2 Business Days',
            'Method: Pathao / RedX Courier',
          ],
        },
        {
          title: 'Outside Dhaka',
          items: [
            'Delivery Charge: ৳120',
            'Estimated Time: 3 - 5 Business Days',
            'Method: Sundarban Courier (Condition applied)',
          ],
        },
      ],
      footerNote: '* Note: Heavy items may incur additional charges depending on volumetric weight.',
    },
    groundingSimulation: {
      question: 'How long does delivery take inside Dhaka?',
      answer:
        'Delivery inside Dhaka typically takes 1 to 2 business days. The delivery charge is ৳60. We use Pathao or RedX for these deliveries.',
      sourceTag: 'Shipping Policy',
    },
    usageStats: {
      retrievals: 142,
      trendPct: 12,
    },
    knowledgeGaps: [
      '"Do you offer international shipping?"',
      '"Can I track Pathao live status?"',
    ],
  },
  {
    id: 'kb-2',
    title: 'Return Policy',
    category: 'Returns & Refunds',
    status: 'active',
    usesCount: 89,
    lastEdited: 'Nov 02, 2023 by Admin',
    previewContent: {
      heading: '7-Day Hassel-Free Returns',
      description:
        'If you receive a defective or mismatched product, you can request a replacement or full refund within 7 days.',
      sections: [
        {
          title: 'Eligible Conditions',
          items: [
            'Product must be unused and in original packaging',
            'Invoice / Order reference required',
            'Tag must remain intact',
          ],
        },
      ],
    },
    groundingSimulation: {
      question: 'Can I return if the size doesn\'t fit?',
      answer:
        'Yes! You can request an exchange within 7 days as long as the tag remains intact and unused in original packaging.',
      sourceTag: 'Return Policy',
    },
    usageStats: {
      retrievals: 89,
      trendPct: 8,
    },
    knowledgeGaps: ['"Who pays the return courier fee?"'],
  },
  {
    id: 'kb-3',
    title: 'Cash on Delivery',
    category: 'Payment',
    status: 'active',
    usesCount: 312,
    lastEdited: 'Dec 10, 2023 by Admin',
    previewContent: {
      heading: 'Cash on Delivery (COD)',
      description:
        'Pay cash directly to the delivery agent upon receiving your order at your doorstep.',
      sections: [
        {
          title: 'COD Terms',
          items: [
            'Available for all locations in Bangladesh',
            'Advance delivery fee (৳60) required for orders above ৳5,000 outside Dhaka',
          ],
        },
      ],
    },
    groundingSimulation: {
      question: 'Is cash on delivery available in Chittagong?',
      answer:
        'Yes, Cash on Delivery is available nationwide across Bangladesh, including Chittagong!',
      sourceTag: 'Cash on Delivery',
    },
    usageStats: {
      retrievals: 312,
      trendPct: 24,
    },
    knowledgeGaps: ['"Can I pay via bKash to the rider?"'],
  },
  {
    id: 'kb-4',
    title: 'Warranty Information',
    category: 'Warranty',
    status: 'needs_review',
    usesCount: 45,
    lastEdited: 'Jan 15, 2024 by Support',
    previewContent: {
      heading: 'Official Brand Warranty',
      description:
        'All electronic items come with official manufacturer warranty against hardware defects.',
      sections: [
        {
          title: 'Claiming Warranty',
          items: [
            'Present serial number & ORA order reference',
            'Processing time: 5 - 7 working days',
          ],
        },
      ],
    },
    groundingSimulation: {
      question: 'How do I claim warranty for my headphone?',
      answer:
        'Provide your order number to ORA support. Warranty processing takes 5-7 working days.',
      sourceTag: 'Warranty Information',
    },
    usageStats: {
      retrievals: 45,
      trendPct: -3,
    },
    knowledgeGaps: ['"Does warranty cover water damage?"'],
  },
];

export const MOCK_UPLOADED_DOCS: UploadedDoc[] = [
  { id: 'doc-1', name: 'Return_Policy_2024.pdf', type: 'PDF Document', status: 'synced' },
  { id: 'doc-2', name: 'Warranty_Guide.pdf',      type: 'PDF Document', status: 'synced' },
];
