import { apiClient } from '@/lib/api-client';
import { Order } from './orders-service';
import { Conversation } from './conversations-service';

export interface DashboardStatsResponse {
  productTotal: number;
  orderTotal: number;
  conversationTotal: number;
  planName: string | null;
  planStatus: string | null;
  recentOrders: Order[];
  recentConversations: Conversation[];
}

export async function getDashboardStatsApi(): Promise<DashboardStatsResponse> {
  return apiClient<DashboardStatsResponse>('/dashboard/stats', {
    method: 'GET',
  });
}
