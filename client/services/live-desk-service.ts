import { apiClient } from '@/lib/api-client';

export type StateType = 'searching' | 'comparing' | 'cart' | 'checking' | 'idle';

export interface LiveStatsResponse {
  activeConvos: number;
  activeVoiceCalls: number;
  productSearches: number;
  productSearchesDelta: string;
  cartActions: number;
  cartActionsDelta: string;
  ordersInfluenced: number;
  ordersInfluencedDelta: string;
}

export interface LiveFeedSession {
  id: string;
  initial: string;
  name: string;
  message: string;
  time: string;
  actionLabel: string;
  stateLabel: string;
  stateType: StateType;
  avatarIdx: number;
  sessionId: string;
  channel: string;
  verifiedItem?: {
    name: string;
    price: string;
    inventory: string;
    status: string;
  };
}

export interface LiveVoiceSession {
  id: string;
  sessionId: string;
  initial: string;
  name: string;
  status: string;
  waveformClass: string;
  avatarBgClass: string;
  duration: string;
}

export interface LiveSalesAction {
  label: string;
  count: number;
  delta: string;
}

export interface SystemServiceStatus {
  name: string;
  latency: string;
  status: string;
}

export interface SystemHealthResponse {
  allOnline: boolean;
  services: SystemServiceStatus[];
}

export async function getLiveStatsApi(): Promise<LiveStatsResponse> {
  return apiClient<LiveStatsResponse>('/live-desk/stats', {
    method: 'GET',
  });
}

export async function getActivityFeedApi(limit = 10): Promise<LiveFeedSession[]> {
  return apiClient<LiveFeedSession[]>(`/live-desk/activity-feed?limit=${limit}`, {
    method: 'GET',
  });
}

export async function getVoiceSessionsApi(): Promise<LiveVoiceSession[]> {
  return apiClient<LiveVoiceSession[]>('/live-desk/voice-sessions', {
    method: 'GET',
  });
}

export async function getSalesConversionsApi(): Promise<LiveSalesAction[]> {
  return apiClient<LiveSalesAction[]>('/live-desk/sales-conversions', {
    method: 'GET',
  });
}

export async function getSystemHealthApi(): Promise<SystemHealthResponse> {
  return apiClient<SystemHealthResponse>('/live-desk/system-health', {
    method: 'GET',
  });
}
