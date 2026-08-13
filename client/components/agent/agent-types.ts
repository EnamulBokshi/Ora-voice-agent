import { KnowledgeDoc, KnowledgeChunk, DocType } from '@/types/knowledge';

export type KnowledgeCategory =
  | 'All'
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
  docType: DocType;
  content: string;
  sourceUrl?: string;
  status: 'active' | 'needs_review';
  usesCount: number;
  lastEdited: string;
  createdAt: string;
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
  chunks: KnowledgeChunk[];
  rawDoc?: KnowledgeDoc;
}

export interface UploadedDoc {
  id: string;
  name: string;
  type: string;
  status: 'synced' | 'processing';
  rawDoc?: KnowledgeDoc;
}

export function mapDocTypeToCategory(doc: KnowledgeDoc | DocType): KnowledgeCategory {
  const docType = typeof doc === 'string' ? doc : doc.docType;
  const title = typeof doc === 'object' ? doc.title.toLowerCase() : '';
  const content = typeof doc === 'object' ? doc.content.toLowerCase() : '';

  if (docType === DocType.FAQ) return 'FAQs';
  if (docType === DocType.UPLOADED_DOC) return 'Documents';

  // Smart keyword detection for policy sub-categories
  if (
    title.includes('deliver') ||
    title.includes('ship') ||
    title.includes('express') ||
    title.includes('courier') ||
    content.includes('delivery') ||
    content.includes('shipping')
  ) {
    return 'Shipping & Delivery';
  }

  if (
    title.includes('return') ||
    title.includes('refund') ||
    title.includes('exchange') ||
    content.includes('return') ||
    content.includes('refund')
  ) {
    return 'Returns & Refunds';
  }

  if (
    title.includes('pay') ||
    title.includes('bkash') ||
    title.includes('cod') ||
    title.includes('cash') ||
    content.includes('payment')
  ) {
    return 'Payment';
  }

  if (
    title.includes('warrant') ||
    title.includes('guarant') ||
    content.includes('warranty')
  ) {
    return 'Warranty';
  }

  return 'Store Policies';
}

export function mapCategoryToDocType(category: KnowledgeCategory): DocType {
  switch (category) {
    case 'FAQs':
      return DocType.FAQ;
    case 'Documents':
      return DocType.UPLOADED_DOC;
    case 'Shipping & Delivery':
    case 'Returns & Refunds':
    case 'Payment':
    case 'Warranty':
    case 'Store Policies':
    default:
      return DocType.POLICY;
  }
}

export function mapKnowledgeDocToItem(
  doc: KnowledgeDoc,
  chunks: KnowledgeChunk[] = [],
): KnowledgeItem {
  const category = mapDocTypeToCategory(doc);
  const lines = doc.content.split('\n').filter((l) => l.trim().length > 0);
  const heading = doc.title;
  const description = lines[0] || 'Store policy documentation details.';

  const bulletItems = lines.slice(1, 6);

  return {
    id: doc._id,
    title: doc.title,
    category,
    docType: doc.docType,
    content: doc.content,
    sourceUrl: doc.sourceUrl,
    status: doc.isActive ? 'active' : 'needs_review',
    usesCount: chunks.length * 3 + 2,
    lastEdited: doc.updatedAt ? new Date(doc.updatedAt).toLocaleDateString() : 'Recently',
    createdAt: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'Recently',
    previewContent: {
      heading,
      description,
      sections: [
        {
          title: 'Document Guidelines & Rules',
          items: bulletItems.length > 0 ? bulletItems : ['Standard store guidelines.'],
        },
      ],
      footerNote: doc.sourceUrl ? `Source URL: ${doc.sourceUrl}` : undefined,
    },
    groundingSimulation: {
      question: `What is the store policy regarding ${doc.title}?`,
      answer: description,
      sourceTag: doc.title,
    },
    chunks,
    rawDoc: doc,
  };
}
