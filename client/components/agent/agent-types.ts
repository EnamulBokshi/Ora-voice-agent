export type KnowledgeCategory =
  | 'Store Policies'
  | 'Shipping & Delivery'
  | 'Returns & Refunds'
  | 'Payment'
  | 'Warranty'
  | 'FAQs'
  | 'Documents';

export interface KnowledgeItem {
  id: string;
  title: string;
  category: KnowledgeCategory;
  status: 'active' | 'needs_review';
  usesCount: number;
  lastEdited: string;
  previewContent: {
    heading: string;
    description: string;
    sections: {
      title: string;
      items: string[];
    }[];
    footerNote?: string;
  };
  groundingSimulation: {
    question: string;
    answer: string;
    sourceTag: string;
  };
  usageStats: {
    retrievals: number;
    trendPct: number;
  };
  knowledgeGaps: string[];
}

export interface UploadedDoc {
  id: string;
  name: string;
  type: string;
  status: 'synced' | 'processing';
}
