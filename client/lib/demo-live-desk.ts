/**
 * Demo fallback data for Live Desk.
 * Isolated in this file so it can be enabled/disabled or removed in one prompt.
 */

import type {
  LiveStatsResponse,
  LiveFeedSession,
  LiveVoiceSession,
  LiveSalesAction,
  SystemHealthResponse,
} from '@/services/live-desk-service';

export const demoLiveStats: LiveStatsResponse = {
  activeConvos: 4,
  activeVoiceCalls: 2,
  productSearches: 28,
  productSearchesDelta: '+12%',
  cartActions: 9,
  cartActionsDelta: '+5%',
  ordersInfluenced: 6,
  ordersInfluencedDelta: '+2',
};

export const demoLiveFeed: LiveFeedSession[] = [
  {
    id: 'live-feed-1',
    sessionId: '#SES-8821',
    name: 'Nadia Rahman',
    initial: 'N',
    channel: 'Storefront Chat',
    message: 'Does the Artisan Leather Tote come with a laptop compartment?',
    time: 'Just now',
    actionLabel: 'Product Inquiry',
    stateLabel: 'Comparing',
    stateType: 'comparing',
    avatarIdx: 0,
    verifiedItem: {
      name: 'Artisan Leather Tote',
      price: '$129.00',
      inventory: '24 in stock',
      status: 'Live Verified',
    },
  },
  {
    id: 'live-feed-2',
    sessionId: '#SES-8820',
    name: 'Sarah Chen',
    initial: 'S',
    channel: 'Voice Call',
    message: 'Can you recommend a pour-over set that works on induction stoves?',
    time: '2m ago',
    actionLabel: 'Voice Stream',
    stateLabel: 'In Cart',
    stateType: 'cart',
    avatarIdx: 1,
    verifiedItem: {
      name: 'Ceramic Pour-Over Set',
      price: '$54.00',
      inventory: '41 in stock',
      status: 'Live Verified',
    },
  },
  {
    id: 'live-feed-3',
    sessionId: '#SES-8819',
    name: 'Marcus Vance',
    initial: 'M',
    channel: 'Storefront Chat',
    message: 'Is express shipping available for delivery in California?',
    time: '4m ago',
    actionLabel: 'Shipping & Tax',
    stateLabel: 'Checking',
    stateType: 'checking',
    avatarIdx: 2,
    verifiedItem: {
      name: 'Wool Throw Blanket',
      price: '$89.00',
      inventory: 'Pre-order available',
      status: 'Live Verified',
    },
  },
  {
    id: 'live-feed-4',
    sessionId: '#SES-8818',
    name: 'Elena Rostova',
    initial: 'E',
    channel: 'Voice Call',
    message: 'Checking if the handmade ceramic mugs are dishwasher safe.',
    time: '7m ago',
    actionLabel: 'Spec Inquiry',
    stateLabel: 'Searching',
    stateType: 'searching',
    avatarIdx: 3,
    verifiedItem: {
      name: 'Ceramic Pour-Over Set',
      price: '$54.00',
      inventory: '41 in stock',
      status: 'Live Verified',
    },
  },
];

export const demoLiveVoiceSessions: LiveVoiceSession[] = [
  {
    id: 'voice-1',
    sessionId: '#SES-8820',
    initial: 'S',
    name: 'Sarah Chen',
    status: 'In Conversation',
    waveformClass: 'voice-waveform-active',
    avatarBgClass: 'bg-[color:var(--status-online)]/15 text-[color:var(--status-online)]',
    duration: '02:14',
  },
  {
    id: 'voice-2',
    sessionId: '#SES-8818',
    initial: 'E',
    name: 'Elena Rostova',
    status: 'Active Call',
    waveformClass: 'voice-waveform-active',
    avatarBgClass: 'bg-primary/15 text-primary',
    duration: '01:05',
  },
];

export const demoLiveSalesActions: LiveSalesAction[] = [
  { label: 'Recommendations Offered', count: 18, delta: '+4' },
  { label: 'Upsells Accepted',         count: 7,  delta: '+2' },
  { label: 'Items Added to Cart',      count: 9,  delta: '+3' },
  { label: 'Checkout Assisted',        count: 5,  delta: '+1' },
  { label: 'Orders Placed Live',       count: 6,  delta: '+2' },
];

export const demoSystemHealth: SystemHealthResponse = {
  allOnline: true,
  services: [
    { name: 'Store Chat Gateway',     latency: '12ms', status: 'Operational' },
    { name: 'Voice Stream Engine',    latency: '48ms', status: 'Operational' },
    { name: 'Conversation Runtime',   latency: '18ms', status: 'Operational' },
    { name: 'Search & Catalog Index', latency: '14ms', status: 'Operational' },
    { name: 'Catalog Auto-Sync',      latency: 'Active', status: 'Operational' },
    { name: 'Webhook & Order Relay',  latency: 'Active', status: 'Operational' },
  ],
};
