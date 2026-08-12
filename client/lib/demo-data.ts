/**
 * Demo fallback data used when the backend returns empty collections.
 * These are illustrative records so pages render useful content before
 * real store data exists. Never shown when the API returns data.
 */

import { ProductAvailability, SourceTier, ProductDocument } from '@/types/product';
import { Order } from '@/services/orders-service';
import { Conversation } from '@/types/conversation';
import { Customer } from '@/types/customer';
import { Invoice } from '@/types/invoices';
import { Plan, SubscriptionDetailsResponse } from '@/types/billing';
import { ProfileResponseData } from '@/types/auth';
import { ConversationItem, ChatMessage } from '@/components/conversations/conversation-types';

const daysAgo = (n: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 24, 0, 0);
  return d.toISOString();
};

export const demoProducts: ProductDocument[] = [
  {
    _id: 'demo-prod-1',
    businessId: 'demo-biz',
    nativeProductId: 'SKU-1001',
    name: 'Artisan Leather Tote',
    description: 'Hand-stitched full-grain leather tote, vegetable-tanned.',
    price: 129.0,
    currency: 'USD',
    availability: ProductAvailability.IN_STOCK,
    stockQuantity: 24,
    images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=300&q=80'],
    category: 'Bags',
    attributes: { brand: 'Hearth & Hide' },
    sourceTier: SourceTier.TIER1_CONNECTOR,
    confidenceScore: 0.95,
    isEmbedded: true,
    lastVerifiedAt: daysAgo(0, 9),
    isActive: true,
    timesRecommendedByAgent: 12,
    timesUpsold: 4,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(0),
  },
  {
    _id: 'demo-prod-2',
    businessId: 'demo-biz',
    nativeProductId: 'SKU-1002',
    name: 'Ceramic Pour-Over Set',
    description: 'Stoneware pour-over brewer with matching carafe.',
    price: 54.0,
    currency: 'USD',
    availability: ProductAvailability.IN_STOCK,
    stockQuantity: 41,
    images: ['https://images.unsplash.com/photo-1517130068649-a7901c0e0c6c?w=300&q=80'],
    category: 'Kitchen',
    attributes: { brand: 'Kettle & Clay' },
    sourceTier: SourceTier.TIER2_FEED,
    confidenceScore: 0.88,
    isEmbedded: true,
    lastVerifiedAt: daysAgo(1, 14),
    isActive: true,
    timesRecommendedByAgent: 8,
    timesUpsold: 3,
    createdAt: daysAgo(28),
    updatedAt: daysAgo(1),
  },
  {
    _id: 'demo-prod-3',
    businessId: 'demo-biz',
    nativeProductId: 'SKU-1003',
    name: 'Wool Throw Blanket',
    description: 'Lightweight merino wool throw in oat.',
    price: 89.0,
    currency: 'USD',
    availability: ProductAvailability.PREORDER,
    stockQuantity: 0,
    images: ['https://images.unsplash.com/photo-1580301762395-24ce36d77559?w=300&q=80'],
    category: 'Home',
    attributes: { brand: 'Hearth & Hide' },
    sourceTier: SourceTier.TIER3_PASSIVE,
    confidenceScore: 0.62,
    isEmbedded: false,
    lastVerifiedAt: daysAgo(4, 11),
    isActive: true,
    timesRecommendedByAgent: 3,
    timesUpsold: 0,
    createdAt: daysAgo(21),
    updatedAt: daysAgo(4),
  },
];

export const demoOrders: Order[] = [
  {
    _id: 'demo-order-1',
    businessId: 'demo-biz',
    orderNumber: 'ORD-2026-000101',
    items: [{ productId: 'demo-prod-1', name: 'Artisan Leather Tote', quantity: 1, unitPrice: 129 }],
    totalAmount: 129,
    currency: 'USD',
    status: 'delivered',
    shippingAddress: { fullName: 'Nadia Rahman', city: 'Dhaka', country: 'BD' },
    createdAt: daysAgo(2, 15),
    updatedAt: daysAgo(1, 9),
  },
  {
    _id: 'demo-order-2',
    businessId: 'demo-biz',
    orderNumber: 'ORD-2026-000100',
    items: [{ productId: 'demo-prod-2', name: 'Ceramic Pour-Over Set', quantity: 2, unitPrice: 54 }],
    totalAmount: 108,
    currency: 'USD',
    status: 'confirmed',
    shippingAddress: { fullName: 'Sarah Chen', city: 'Toronto', country: 'CA' },
    createdAt: daysAgo(5, 12),
    updatedAt: daysAgo(5, 12),
  },
  {
    _id: 'demo-order-3',
    businessId: 'demo-biz',
    orderNumber: 'ORD-2026-000099',
    items: [{ productId: 'demo-prod-1', name: 'Artisan Leather Tote', quantity: 1, unitPrice: 129 }],
    totalAmount: 129,
    currency: 'USD',
    status: 'pending',
    shippingAddress: { fullName: 'Omar Faruq', city: 'Chattogram', country: 'BD' },
    createdAt: daysAgo(0, 8),
    updatedAt: daysAgo(0, 8),
  },
];

export const demoConversations: Conversation[] = [
  {
    _id: 'demo-conv-1',
    businessId: 'demo-biz',
    sessionId: 'sess_demo_9f3a71c2',
    channel: 'widget_chat',
    status: 'active',
    lastActivityAt: daysAgo(0, 10),
    createdAt: daysAgo(0, 10),
    updatedAt: daysAgo(0, 10),
  },
  {
    _id: 'demo-conv-2',
    businessId: 'demo-biz',
    sessionId: 'sess_demo_44b09d1e',
    channel: 'widget_voice',
    status: 'closed',
    lastActivityAt: daysAgo(1, 16),
    createdAt: daysAgo(1, 16),
    updatedAt: daysAgo(1, 9),
  },
  {
    _id: 'demo-conv-3',
    businessId: 'demo-biz',
    sessionId: 'sess_demo_b7c2f00a',
    channel: 'widget_chat',
    status: 'active',
    lastActivityAt: daysAgo(0, 12),
    createdAt: daysAgo(0, 12),
    updatedAt: daysAgo(0, 12),
  },
];

export const demoCustomers: Customer[] = [
  {
    _id: 'demo-cust-1',
    businessId: 'demo-biz',
    name: 'Nadia Rahman',
    email: 'nadia@example.com',
    phone: '+880 17xx-xxxxxx',
    extractedPreferences: { preferredStyle: 'minimal', budget: 'mid' },
    pastOrderIds: ['demo-order-1'],
    createdAt: daysAgo(30),
    updatedAt: daysAgo(2),
  },
  {
    _id: 'demo-cust-2',
    businessId: 'demo-biz',
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    phone: '+1 416-555-0123',
    extractedPreferences: { preferredStyle: 'classic', budget: 'premium' },
    pastOrderIds: ['demo-order-2'],
    createdAt: daysAgo(24),
    updatedAt: daysAgo(5),
  },
  {
    _id: 'demo-cust-3',
    businessId: 'demo-biz',
    name: 'Omar Faruq',
    email: 'omar@example.com',
    phone: '+880 18xx-xxxxxx',
    extractedPreferences: { preferredStyle: 'rugged', budget: 'mid' },
    pastOrderIds: ['demo-order-3'],
    createdAt: daysAgo(12),
    updatedAt: daysAgo(0),
  },
];

export const demoPlans: Plan[] = [
  {
    _id: 'demo-plan-free',
    planId: 'free',
    name: 'Free Tier',
    priceUsdCents: 0,
    priceBdtPaisa: 0,
    billingInterval: 'monthly',
    limits: { conversationMinutes: 100, ordersPerMonth: 20, connectedStores: 1, seats: 1 },
    features: ['100 conversation minutes', '20 Tier 1 orders', '1 store connector', 'Basic RAG search'],
    isActive: true,
  },
  {
    _id: 'demo-plan-growth',
    planId: 'growth',
    name: 'Growth Plan',
    priceUsdCents: 4900,
    priceBdtPaisa: 550000,
    billingInterval: 'monthly',
    limits: { conversationMinutes: 2000, ordersPerMonth: 500, connectedStores: 3, seats: 5 },
    features: ['2,000 conversation minutes', '500 Tier 1 orders', '3 store connectors', '5 staff seats', 'Full RAG vector search'],
    isActive: true,
  },
  {
    _id: 'demo-plan-scale',
    planId: 'scale',
    name: 'Scale Plan',
    priceUsdCents: 19900,
    priceBdtPaisa: 2200000,
    billingInterval: 'monthly',
    limits: { conversationMinutes: 100000, ordersPerMonth: 100000, connectedStores: 99, seats: 99 },
    features: ['Unlimited conversation minutes', 'Unlimited orders', 'Unlimited store connectors', 'Unlimited seats', 'Priority support'],
    isActive: true,
  },
];

export const demoSubscription: SubscriptionDetailsResponse = {
  subscription: {
    _id: 'demo-sub-1',
    businessId: 'demo-biz',
    planId: 'free',
    billingProvider: 'stripe',
    status: 'active',
    currentPeriodStart: daysAgo(10),
    currentPeriodEnd: daysAgo(-20),
    cancelAtPeriodEnd: false,
    createdAt: daysAgo(10),
    updatedAt: daysAgo(0),
  },
  plan: demoPlans[0],
  usage: { conversationMinutes: 47, ordersPerMonth: 3 },
};

export const demoInvoices: Invoice[] = [
  {
    _id: 'demo-inv-1',
    businessId: 'demo-biz',
    invoiceNumber: 'ORA-2026-000101',
    subscriptionId: 'demo-sub-1',
    transactionId: 'demo-txn-1',
    amountUsdCents: 0,
    amountBdtPaisa: 0,
    currency: 'USD',
    taxAmount: 0,
    pdfUrl: '/api/v1/invoices/demo-inv-1/pdf',
    status: 'generated',
    createdAt: daysAgo(10),
    updatedAt: daysAgo(10),
  },
  {
    _id: 'demo-inv-2',
    businessId: 'demo-biz',
    invoiceNumber: 'ORA-2026-000100',
    subscriptionId: 'demo-sub-1',
    transactionId: 'demo-txn-0',
    amountUsdCents: 0,
    amountBdtPaisa: 0,
    currency: 'USD',
    taxAmount: 0,
    pdfUrl: '/api/v1/invoices/demo-inv-2/pdf',
    status: 'generated',
    createdAt: daysAgo(40),
    updatedAt: daysAgo(40),
  },
];

export const demoProfile: ProfileResponseData = {
  user: {
    id: 'demo-user-1',
    name: 'Merchant Owner',
    email: 'owner@demo-store.com',
    role: 'owner',
    emailVerified: true,
  },
  business: {
    id: 'demo-biz',
    name: 'Demo Store',
    domain: 'demo-store.example.com',
    publishableKey: 'biz_live_demo_xxxxxxxxxxxx',
    status: 'active',
  },
};

export const demoConversationItems: ConversationItem[] = [
  {
    id: 'demo-conv-1',
    customerName: 'Nadia Rahman',
    channel: 'chat',
    status: 'active',
    lastMessageTime: daysAgo(0, 10),
    previewMessage: '"Does the leather tote come in tan?"',
    sessionRef: 'sess_demo_9f3a71c2',
    transcript: demoChatTranscript('Does the leather tote come in tan?', 'Yes — tan and black are in stock. Want me to add one to your order?'),
  },
  {
    id: 'demo-conv-2',
    customerName: 'Sarah Chen',
    channel: 'voice',
    status: 'completed',
    lastMessageTime: daysAgo(1, 16),
    previewMessage: '"I\'ll take the pour-over set, please."',
    sessionRef: 'sess_demo_44b09d1e',
    transcript: demoChatTranscript('Can you help me pick a coffee brewer?', 'The Ceramic Pour-Over Set is our best seller. I added 2 to your order — confirmed!'),
  },
  {
    id: 'demo-conv-3',
    customerName: 'Omar Faruq',
    channel: 'chat',
    status: 'active',
    lastMessageTime: daysAgo(0, 12),
    previewMessage: '"Is the blanket available for preorder?"',
    sessionRef: 'sess_demo_b7c2f00a',
    transcript: demoChatTranscript('Is the blanket available for preorder?', 'Yes — the Wool Throw Blanket ships in 2 weeks. Shall I reserve one?'),
  },
];

function demoChatTranscript(customerText: string, oraText: string): ChatMessage[] {
  return [
    { id: 'msg-1', sender: 'customer', text: 'Hi, I need some help with your products.', time: '10:02 AM' },
    { id: 'msg-2', sender: 'ora', text: customerText ? `Sure! ${customerText}` : 'Sure! What would you like to know?', time: '10:02 AM' },
    { id: 'msg-3', sender: 'ora', text: oraText, time: '10:03 AM' },
  ];
}
