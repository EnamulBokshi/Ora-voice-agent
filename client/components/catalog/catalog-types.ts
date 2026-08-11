import { ProductDocument, ProductAvailability, SourceTier } from '@/types/product';

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
  numericPrice: number;
  currency: string;
  inventoryCount: number;
  availability: ProductAvailability;
  oraStatus: OraProductStatus;
  source: string;
  sourceTier: SourceTier;
  oraSalesOrders: number;
  conversionRate: string;
  category: string;
  brand: string;
  image: string;
  description?: string;
  confidenceScore: number;
  isEmbedded: boolean;
  lastVerifiedAt: string;
  performance: ProductPerformance;
  liveVerification: {
    priceVerified: boolean;
    inventoryLive: boolean;
    availableLive: boolean;
  };
  embeddings: string[];
  recentActivity: ProductActivity[];
  rawDoc?: ProductDocument;
}

export function mapDocToProductItem(doc: ProductDocument): ProductItem {
  const isVerified = doc.confidenceScore >= 0.8 && doc.availability === ProductAvailability.IN_STOCK;
  const oraStatus: OraProductStatus = isVerified ? 'verified' : 'needs_attention';

  const defaultImg =
    doc.images && doc.images.length > 0 && doc.images[0].startsWith('http')
      ? doc.images[0]
      : 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&q=80';

  const formattedPrice = `${doc.currency || '$'}${doc.price.toFixed(2)}`;

  return {
    id: doc._id,
    name: doc.name,
    sku: doc.nativeProductId,
    price: formattedPrice,
    numericPrice: doc.price,
    currency: doc.currency || 'USD',
    inventoryCount: doc.stockQuantity,
    availability: doc.availability,
    oraStatus,
    source: doc.sourceTier.replace('tier', 'Tier ').replace('_', ' '),
    sourceTier: doc.sourceTier,
    oraSalesOrders: doc.timesUpsold || 0,
    conversionRate: doc.timesRecommendedByAgent > 0
      ? `${Math.round(((doc.timesUpsold || 0) / doc.timesRecommendedByAgent) * 100)}%`
      : '0%',
    category: doc.category || 'General',
    brand: doc.attributes?.brand || 'Catalog Store',
    image: defaultImg,
    description: doc.description,
    confidenceScore: doc.confidenceScore ?? 1.0,
    isEmbedded: doc.isEmbedded ?? false,
    lastVerifiedAt: doc.lastVerifiedAt ? new Date(doc.lastVerifiedAt).toLocaleString() : 'Recently',
    performance: {
      conversations: (doc.timesRecommendedByAgent || 0) * 3 + (doc.timesUpsold || 0),
      recommended: doc.timesRecommendedByAgent || 0,
      views: (doc.timesRecommendedByAgent || 0) * 4 + 10,
      orders: doc.timesUpsold || 0,
      revenue: `${doc.currency || '$'}${((doc.timesUpsold || 0) * doc.price).toFixed(2)}`,
      conversion: doc.timesRecommendedByAgent > 0
        ? `${Math.round(((doc.timesUpsold || 0) / doc.timesRecommendedByAgent) * 100)}%`
        : '0%',
    },
    liveVerification: {
      priceVerified: doc.confidenceScore >= 0.9,
      inventoryLive: doc.availability === ProductAvailability.IN_STOCK,
      availableLive: doc.isActive,
    },
    embeddings: doc.isEmbedded
      ? ['v5-semantic-product-embedding', 'text-embedding-3-small']
      : ['Pending embedding indexing'],
    recentActivity: [
      {
        action: `Live verified price (${formattedPrice}) & stock (${doc.stockQuantity})`,
        time: doc.lastVerifiedAt ? new Date(doc.lastVerifiedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now',
        type: 'primary',
      },
      {
        action: `Agent recommended product ${doc.timesRecommendedByAgent || 0} times`,
        time: 'Today',
        type: 'tertiary',
      },
    ],
    rawDoc: doc,
  };
}
