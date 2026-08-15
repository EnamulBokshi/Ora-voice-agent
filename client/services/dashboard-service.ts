import { apiClient } from '@/lib/api-client';
import { Order } from './orders-service';
import { Conversation } from './conversations-service';

export interface RevenueDataPoint {
  label: string;
  date?: string;
  value: number;
}

export interface RevenueTimeseries {
  daily: RevenueDataPoint[];
  weekly: RevenueDataPoint[];
  growthRate: string;
  totalRevenue: number;
}

export interface FunnelStep {
  label: string;
  count: number;
  pct: number;
  isLast?: boolean;
}

export interface DashboardStatsResponse {
  productTotal: number;
  orderTotal: number;
  conversationTotal: number;
  activeChats: number;
  activeVoiceCalls: number;
  totalRevenue: number;
  revenueTrend: string;
  ordersTrend: string;
  conversationsTrend: string;
  planName: string | null;
  planStatus: string | null;
  revenueTimeseries: RevenueTimeseries;
  funnel: FunnelStep[];
  overallConversion: number;
  recentOrders: Order[];
  recentConversations: Conversation[];
}

export async function getDashboardStatsApi(): Promise<DashboardStatsResponse> {
  return apiClient<DashboardStatsResponse>('/dashboard/stats', {
    method: 'GET',
  });
}

export async function getRevenueAnalyticsApi(): Promise<RevenueTimeseries> {
  return apiClient<RevenueTimeseries>('/dashboard/revenue-analytics', {
    method: 'GET',
  });
}

export async function getFunnelAnalyticsApi(): Promise<{
  funnel: FunnelStep[];
  overallConversion: number;
}> {
  return apiClient<{
    funnel: FunnelStep[];
    overallConversion: number;
  }>('/dashboard/funnel-analytics', {
    method: 'GET',
  });
}
