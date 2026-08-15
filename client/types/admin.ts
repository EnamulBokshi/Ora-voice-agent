export interface PlatformOverviewStats {
  totalBusinesses: number;
  activeBusinesses: number;
  suspendedBusinesses: number;
  totalUsers: number;
  totalConversations: number;
  totalCustomers: number;
  totalVoiceMinutes: number;
  voiceConversationsCount: number;
  platformMRR: number;
}

export interface SystemStatus {
  serverUptimeSeconds: number;
  nodeMemoryUsageMB: number;
  redisStatus: string;
  redisLatencyMs: number;
  mongoStatus: string;
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

export interface PlatformStatsData {
  overview: PlatformOverviewStats;
  system: SystemStatus;
  recentSignups: RecentSignup[];
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
