export type OrderStatus = 'completed' | 'processing' | 'pending' | 'refunded';
export type OrderChannel = 'Voice AI' | 'Chat Assistant' | 'Storefront Recs';

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

export interface OrderRecord {
  id: string;
  customerName: string;
  customerEmail: string;
  channel: OrderChannel;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  timestamp: string;
  oraAttribution: {
    ruleApplied: string;
    transcriptSnippet: string;
    confidenceScore: number;
  };
  shippingAddress: string;
  paymentMethod: string;
}

export const MOCK_ORDERS: OrderRecord[] = [
  {
    id: 'ORA-9082',
    customerName: 'Fahim Rahman',
    customerEmail: 'fahim.r@example.com',
    channel: 'Voice AI',
    items: [
      { name: 'Nike Pegasus 41 (Size 42 EU)', qty: 1, price: 142.0 },
    ],
    totalAmount: 142.0,
    status: 'completed',
    timestamp: '2 min ago',
    oraAttribution: {
      ruleApplied: 'Automated Size Recommendation & Upsell',
      transcriptSnippet: '"ORA recommended size 42 based on past purchases and completed instant checkout via Pathao COD."',
      confidenceScore: 98,
    },
    shippingAddress: 'Gulshan 2, Dhaka 1212',
    paymentMethod: 'Cash on Delivery (COD)',
  },
  {
    id: 'ORA-9081',
    customerName: 'Sarah Jenkins',
    customerEmail: 'sarah.j@example.com',
    channel: 'Chat Assistant',
    items: [
      { name: 'iPhone 16 Pro 256GB - Natural Titanium', qty: 1, price: 1199.0 },
    ],
    totalAmount: 1199.0,
    status: 'processing',
    timestamp: '18 min ago',
    oraAttribution: {
      ruleApplied: 'High-Intent Abandoned Cart Recovery',
      transcriptSnippet: '"Resolved query regarding 1-year official warranty before sending direct payment link."',
      confidenceScore: 95,
    },
    shippingAddress: 'Dhanmondi 27, Dhaka 1209',
    paymentMethod: 'bKash Merchant Payment',
  },
  {
    id: 'ORA-9080',
    customerName: 'Marcus Chen',
    customerEmail: 'm.chen@tech.co',
    channel: 'Voice AI',
    items: [
      { name: 'Sony WH-1000XM6 Wireless Headphones', qty: 1, price: 399.0 },
    ],
    totalAmount: 399.0,
    status: 'completed',
    timestamp: '1 hour ago',
    oraAttribution: {
      ruleApplied: 'Voice Agent Noise-Cancellation Comparison',
      transcriptSnippet: '"Voice session verified active noise cancellation specs against XM5, customer converted in 90 seconds."',
      confidenceScore: 99,
    },
    shippingAddress: 'Banani Block 11, Dhaka 1213',
    paymentMethod: 'Credit Card (Visa)',
  },
  {
    id: 'ORA-9079',
    customerName: 'Ayesha Khan',
    customerEmail: 'ayesha.k@gmail.com',
    channel: 'Storefront Recs',
    items: [
      { name: 'Samsung Galaxy S25 Ultra 512GB', qty: 1, price: 1299.0 },
    ],
    totalAmount: 1299.0,
    status: 'pending',
    timestamp: '3 hours ago',
    oraAttribution: {
      ruleApplied: 'Personalized Widget Recommendation',
      transcriptSnippet: '"Personalized widget suggested S25 Ultra bundle with fast charger on product view."',
      confidenceScore: 89,
    },
    shippingAddress: 'Uttara Sector 4, Dhaka 1230',
    paymentMethod: 'Nagad Online',
  },
  {
    id: 'ORA-9078',
    customerName: 'David Miller',
    customerEmail: 'david.m@corp.org',
    channel: 'Chat Assistant',
    items: [
      { name: 'MacBook Air M3 16GB / 512GB', qty: 1, price: 1499.0 },
    ],
    totalAmount: 1499.0,
    status: 'completed',
    timestamp: '5 hours ago',
    oraAttribution: {
      ruleApplied: 'Corporate Order Discount Match',
      transcriptSnippet: '"Matched corporate tier discount policy and generated custom invoice."',
      confidenceScore: 96,
    },
    shippingAddress: 'Chittagong GEC Circle',
    paymentMethod: 'Bank Transfer (EFT)',
  },
  {
    id: 'ORA-9077',
    customerName: 'Tanvir Hasan',
    customerEmail: 'tanvir.h@yahoo.com',
    channel: 'Voice AI',
    items: [
      { name: 'Wireless Ergonomic Keyboard', qty: 1, price: 85.0 },
    ],
    totalAmount: 85.0,
    status: 'refunded',
    timestamp: '1 day ago',
    oraAttribution: {
      ruleApplied: 'Auto Return Verification',
      transcriptSnippet: '"Processed 7-day hassle free return tag verification for incorrect layout."',
      confidenceScore: 92,
    },
    shippingAddress: 'Sylhet Zindabazar',
    paymentMethod: 'Refunded via bKash',
  },
];
