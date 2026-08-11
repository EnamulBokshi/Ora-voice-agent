export type OraProductStatus = 'verified' | 'needs_attention' | 'syncing';

export interface ProductPerformance {
  conversations: number;
  recommended: number;
  views: number;
  orders: number;
  revenue: string;
  conversion: string;
}

export interface ProductActivity {
  action: string;
  time: string;
  type: 'primary' | 'tertiary';
}

export interface ProductItem {
  id: string;
  name: string;
  sku: string;
  price: string;
  inventoryCount: number;
  oraStatus: OraProductStatus;
  source: string;
  oraSalesOrders: number;
  conversionRate: string;
  category: string;
  brand: string;
  image: string;
  performance: ProductPerformance;
  liveVerification: {
    priceVerified: boolean;
    inventoryLive: boolean;
    availableLive: boolean;
  };
  embeddings: string[];
  recentActivity: ProductActivity[];
}

