import { Order } from '@/services/orders-service';

export type { Order } from '@/services/orders-service';

export interface OrderDetailDrawerProps {
  order: Order;
  onClose: () => void;
}
