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

export interface AdminBusinessItem {
  id: string;
  name: string;
  domain: string;
  publishableKey: string;
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
  publishableKey: string;
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

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'owner' | 'admin' | 'staff';
  emailVerified: boolean;
  businessName: string;
  businessId: string | null;
  businessStatus: string;
  createdAt: string;
}

export interface AdminUsersResponse {
  users: AdminUserItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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
}

