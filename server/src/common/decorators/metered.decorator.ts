import { SetMetadata } from '@nestjs/common';

export const METERED_METRIC_KEY = 'metered_metric';

export const Metered = (metricKey: 'conversationMinutes' | 'ordersPerMonth' | 'connectedStores' | 'seats') =>
  SetMetadata(METERED_METRIC_KEY, metricKey);
