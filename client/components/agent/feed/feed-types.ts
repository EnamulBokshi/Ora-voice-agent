import { DocType } from '@/types/knowledge';

export type FeedTabId = 'voice' | 'documents' | 'text';

export interface FeedTab {
  id: FeedTabId;
  label: string;
}

export interface KnowledgeCategoryOption {
  id: string;
  label: string;
  description: string;
  docType: DocType;
}

export const KNOWLEDGE_CATEGORIES: KnowledgeCategoryOption[] = [
  {
    id: 'business',
    label: 'Business Info',
    description: 'Brand story, rules, contact info, how your store works',
    docType: DocType.BRAND_RULE,
  },
  {
    id: 'product',
    label: 'Product Info',
    description: 'Product details, pricing, stock, sizing, specifications',
    docType: DocType.PRODUCT_MANUAL,
  },
  {
    id: 'policy',
    label: 'Store Policy',
    description: 'Shipping, returns, refunds, warranty, payment rules',
    docType: DocType.POLICY,
  },
  {
    id: 'faq',
    label: 'FAQ',
    description: 'Common customer questions and their answers',
    docType: DocType.FAQ,
  },
];

export const FEED_CATEGORY_META: Record<string, { label: string }> = {
  [DocType.BRAND_RULE]: { label: 'Business Info' },
  [DocType.PRODUCT_MANUAL]: { label: 'Product Info' },
  [DocType.POLICY]: { label: 'Store Policy' },
  [DocType.FAQ]: { label: 'FAQ' },
  [DocType.UPLOADED_DOC]: { label: 'Document' },
  [DocType.SALES_PLAYBOOK]: { label: 'Sales Playbook' },
};
