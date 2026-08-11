export type CustomerSegment = 'All' | 'New' | 'Returning' | 'High value' | 'High intent' | 'At risk';

export interface CustomerContext {
  budget: string;
  interest: string;
  size?: string;
}

export interface CustomerJourneyEvent {
  time: string;
  event: string;
  type: 'question' | 'view' | 'order';
}

export interface CustomerRecord {
  id: string;
  name: string;
  email: string;
  conversationsCount: number;
  ordersCount: number;
  totalSpent: number;
  lastInteraction: string;
  segment: CustomerSegment;
  status: 'active' | 'inactive';
  avatar?: string;
  oraSummary: string;
  context: CustomerContext;
  purchaseIntentPct: number;
  interests: {
    name: string;
    pct: number;
  }[];
  journey: CustomerJourneyEvent[];
}


export const MOCK_CUSTOMERS: CustomerRecord[] = [
  {
    id: 'cust-1',
    name: 'Fahim Rahman',
    email: 'fahim.r@example.com',
    conversationsCount: 12,
    ordersCount: 3,
    totalSpent: 426.0,
    lastInteraction: '2 min ago',
    segment: 'Returning',
    status: 'active',
    oraSummary:
      'Fahim is a returning customer who primarily shops for athletic footwear. He has a high likelihood to purchase when presented with personalized discounts on new releases. Currently browsing the summer running collection.',
    context: {
      budget: '<$100',
      interest: 'Running Shoes',
      size: '42 (EU)',
    },
    purchaseIntentPct: 85,
    interests: [
      { name: 'Athletic Footwear', pct: 75 },
      { name: 'Running Apparel',  pct: 45 },
    ],
    journey: [
      { time: '2 mins ago', event: 'Asked ORA about "lightweight trail runners under $100"', type: 'question' },
      { time: '15 mins ago', event: 'Viewed Cloudstrider Pro X', type: 'view' },
      { time: '3 days ago', event: 'Completed Order #ORA-9082 ($142.00)', type: 'order' },
    ],
  },
  {
    id: 'cust-2',
    name: 'Sarah Jenkins',
    email: 'sarah.j@example.com',
    conversationsCount: 3,
    ordersCount: 1,
    totalSpent: 129.5,
    lastInteraction: '1 hour ago',
    segment: 'New',
    status: 'active',
    oraSummary:
      'Sarah is a new buyer interested in smart home devices. Asked about warranty coverage and fast delivery times to Chittagong.',
    context: {
      budget: '$150-$300',
      interest: 'Smart Wearables',
    },
    purchaseIntentPct: 72,
    interests: [
      { name: 'Smart Wearables', pct: 80 },
      { name: 'Audio Tech',     pct: 30 },
    ],
    journey: [
      { time: '1 hour ago', event: 'Asked ORA about official 1-year warranty coverage', type: 'question' },
      { time: '2 hours ago', event: 'Viewed Sony WH-1000XM6 Wireless Headphones', type: 'view' },
    ],
  },
  {
    id: 'cust-3',
    name: 'Marcus Chen',
    email: 'm.chen@tech.co',
    conversationsCount: 24,
    ordersCount: 15,
    totalSpent: 3240.0,
    lastInteraction: 'Yesterday',
    segment: 'High value',
    status: 'active',
    oraSummary:
      'Marcus is a VIP enterprise customer purchasing laptop bundles and office electronics in bulk. High conversion rate via direct voice checkout.',
    context: {
      budget: '$2,000+',
      interest: 'Laptops & Monitors',
    },
    purchaseIntentPct: 94,
    interests: [
      { name: 'Laptops & Computing', pct: 90 },
      { name: 'Office Accessories', pct: 60 },
    ],
    journey: [
      { time: 'Yesterday', event: 'Requested corporate tier bulk pricing quote via Voice AI', type: 'question' },
      { time: '2 days ago', event: 'Completed Order #ORA-9078 ($1,499.00)', type: 'order' },
    ],
  },
];
