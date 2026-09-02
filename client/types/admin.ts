export interface PlatformOverviewStats {
  totalBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  pendingBusinesses: number;
  totalUsers: number;
  totalConversations: number;
  voiceConversationsCount: number;
  textConversationsCount: number;
  totalVoiceMinutes: number;
  totalCustomers: number;
  totalOrders: number;
  totalGmv: number;
  oraAgentOrders: number;
  oraAgentGmv: number;
  totalProducts: number;
  platformMRR: number;
  platformARR: number;
  planDistribution: {
    free: number;
    growth: number;
    scale: number;
  };
  growth: {
    mrrTrend: string;
    storeTrend: string;
    voiceTrend: string;
  };
}

export interface SystemStatus {
  serverUptimeSeconds: number;
  nodeMemoryUsageMB: number;
  nodeMemoryTotalMB: number;
  redisStatus: string;
  redisLatencyMs: number;
  mongoStatus: string;
  environment?: string;
  nodeVersion?: string;
}

export interface RecentSignup {
  id: string;
  name: string;
  domain?: string;
  publishableKey: string;
  status: string;
  connectedPlatform: string;
  createdAt: string;
}

export interface ActivityTimelinePoint {
  date: string;
  conversations: number;
  voiceMinutes: number;
  newStores: number;
  gmv: number;
}

export interface PlatformStatsData {
  overview: PlatformOverviewStats;
  system: SystemStatus;
  recentSignups: RecentSignup[];
  activityTimeline: ActivityTimelinePoint[];
}

export interface DetectedOriginItem {
  origin: string;
  domain: string;
  lastSeen: string;
  sessionCount: number;
  isMismatch: boolean;
}

export interface KeyAnomalyFlags {
  isMultiSite: boolean;
  hasMismatch: boolean;
  activeOriginsCount: number;
}

export interface AdminBusinessItem {
  id: string;
  name: string;
  domain: string;
  publishableKey?: string | null;
  keyStatus?: 'active' | 'suspended' | 'revoked' | 'none';
  detectedOrigins?: DetectedOriginItem[];
  anomalyFlags?: KeyAnomalyFlags;
  keyRevokedAt?: string;
  keyRevokedBy?: string;
  status: 'active' | 'suspended' | 'pending';
  connectedPlatform: string;
  ownerEmail: string;
  ownerName: string;
  conversationsCount: number;
  createdAt: string;
}

export interface AdminBusinessDetail {
  id: string;
  name: string;
  domain: string;
  publishableKey?: string | null;
  keyStatus?: 'active' | 'suspended' | 'revoked' | 'none';
  detectedOrigins?: DetectedOriginItem[];
  anomalyFlags?: KeyAnomalyFlags;
  keyRevokedAt?: string;
  keyRevokedBy?: string;
  status: 'active' | 'suspended' | 'pending';
  connectedPlatform: string;
  owner: {
    name: string;
    email: string;
    role: string;
    createdAt?: string;
  } | null;
  subscription: {
    planId: string;
    status: string;
    billingProvider: string;
    currentPeriodEnd: string;
  } | null;
  metrics: {
    productsCount: number;
    ordersCount: number;
    conversationsCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface AdminBusinessesResponse {
  businesses: AdminBusinessItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminUserSubscription {
  planId: string;
  planName: string;
  billingProvider: 'stripe' | 'bkash' | string;
  status: 'active' | 'trialing' | 'past_due' | 'suspended' | 'canceled' | string;
  isSubscriber: boolean;
  currentPeriodEnd: string | null;
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'owner' | 'admin' | 'staff' | 'user';
  emailVerified: boolean;
  businessName: string;
  businessDomain?: string;
  businessId: string | null;
  businessStatus: string;
  connectedPlatform?: string;
  subscription?: AdminUserSubscription;
  metrics?: {
    conversationsCount: number;
    ordersCount: number;
  };
  createdAt: string;
}

export interface AdminUserStats {
  totalUsers: number;
  totalUsersTrend: string;
  activeSubscribers: number;
  activeSubscribersTrend: string;
  activeUsers: number;
  pendingVerification: number;
  planDistribution: {
    free: number;
    growth: number;
    scale: number;
  };
  roleDistribution: {
    superAdmin: number;
    owner: number;
    admin: number;
    staff: number;
    user: number;
  };
}

export interface AdminUsersResponse {
  users: AdminUserItem[];
  stats: AdminUserStats;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminUserDetail {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'owner' | 'admin' | 'staff' | 'user';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  business: {
    id: string;
    name: string;
    domain: string;
    publishableKey: string;
    status: string;
    connectedPlatform: string;
    createdAt: string;
  } | null;
  subscription: {
    planId: string;
    planName: string;
    billingProvider: string;
    status: string;
    isSubscriber: boolean;
    currentPeriodStart: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  };
  metrics: {
    productsCount: number;
    conversationsCount: number;
    voiceMinutes: number;
    ordersCount: number;
    totalGmv: number;
  };
  recentConversations: {
    id: string;
    sessionId: string;
    customerIdentifier: string;
    status: string;
    turnCount: number;
    createdAt: string;
  }[];
}

export interface CreatePlatformUserPayload {
  name: string;
  email: string;
  password: string;
  role: 'super_admin' | 'owner' | 'admin' | 'staff' | 'user';
  businessId?: string;
  businessName?: string;
}

export interface UpdateAdminUserPayload {
  name?: string;
  email?: string;
  role?: 'super_admin' | 'owner' | 'admin' | 'staff' | 'user';
  emailVerified?: boolean;
}

export interface AdminUserActionPayload {
  action: 'suspend' | 'activate' | 'resend_otp' | 'revoke_sessions' | 'delete';
}

export interface VoiceSessionItem {
  id: string;
  sessionId: string;
  businessName: string;
  customerIdentifier: string;
  status: string;
  turnCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface VoiceSessionsResponse {
  sessions: VoiceSessionItem[];
}

export interface SystemHealthData {
  status: string;
  timestamp: string;
  database: {
    status: string;
    driver: string;
  };
  redis: {
    status: string;
    latencyMs: number;
  };
  process: {
    uptimeSeconds: number;
    memoryUsedMB: number;
    totalMemoryMB: number;
    nodeVersion: string;
  };
  aiEngine?: {
    voiceModel: string;
    liveModel: string;
    embeddingModel: string;
    provider: string;
    hasApiKey?: boolean;
  };
}

export interface PlatformAgentConfigData {
  business: {
    id: string;
    name: string;
    domain: string;
    publishableKey: string;
    keyStatus: string;
    status: string;
  };
  agentConfig: {
    _id: string;
    businessId: string;
    brandVoiceDescription: string;
    businessArchetype: string;
    businessSummary: string;
    customDirectives: string;
    language: string;
    isActive: boolean;
    idleTimeoutSeconds?: number;
    discountFloorPercent?: number;
    updatedAt?: string;
  };
}

export interface UpdatePlatformAgentPayload {
  brandVoiceDescription?: string;
  businessArchetype?: string;
  businessSummary?: string;
  customDirectives?: string;
  language?: string;
  isActive?: boolean;
}

export interface DailyTokenUsagePoint {
  date: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  voiceMinutes: number;
  costUsd: number;
  sessions: number;
}

export interface ChannelCostBreakdownItem {
  count: number;
  costUsd: number;
  tokens: number;
}

export interface PlatformTokenAnalyticsResponse {
  periodDays: number;
  activeModel?: {
    voiceModel: string;
    embeddingModel: string;
  };
  summary: {
    totalTokens: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalVoiceMinutes: number;
    totalCostUsd: number;
    totalCostBdt: number;
    avgCostPerSessionUsd: number;
  };
  timeline: DailyTokenUsagePoint[];
  channelBreakdown: {
    voice: ChannelCostBreakdownItem;
    chat: ChannelCostBreakdownItem;
    rag: ChannelCostBreakdownItem;
    tools: ChannelCostBreakdownItem;
  };
}

export interface MerchantCostItem {
  id: string;
  name: string;
  domain: string;
  status: string;
  planId: string;
  planName: string;
  mrrUsd: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  voiceMinutes: number;
  sessionsCount: number;
  aiCostUsd: number;
  grossProfitUsd: number;
  grossMarginPercent: number;
  budgetCapUsd: number | null;
  budgetStatus: 'normal' | 'warning' | 'exceeded';
  /** Maximum per-customer session duration in seconds. Null = platform default (300s). */
  maxSessionDurationSeconds: number | null;
}



