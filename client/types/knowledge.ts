export enum DocType {
  POLICY = 'policy',
  BRAND_RULE = 'brand_rule',
  FAQ = 'faq',
  SALES_PLAYBOOK = 'sales_playbook',
  UPLOADED_DOC = 'uploaded_doc',
  PRODUCT_MANUAL = 'product_manual',
}

export interface KnowledgeDoc {
  _id: string;
  businessId: string;
  docType: DocType;
  title: string;
  content: string;
  sourceUrl?: string;
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeChunk {
  _id: string;
  businessId: string;
  knowledgeBaseId: string;
  text: string;
  chunkIndex: number;
  metadata?: {
    docTitle?: string;
    docType?: DocType;
    [key: string]: any;
  };
  createdAt: string;
}

export interface CreateKnowledgeDocPayload {
  docType: DocType;
  title: string;
  content: string;
  sourceUrl?: string;
  metadata?: Record<string, any>;
}

export interface CreateKnowledgeDocResponseData {
  document: KnowledgeDoc;
  chunksCount: number;
}

export interface UpdateKnowledgeDocResponseData {
  document: KnowledgeDoc;
  chunksCount?: number;
}

/** One turn of a merchant's voice-feed session, sent for categorisation. */
export interface VoiceTranscriptTurn {
  speaker: 'merchant' | 'ora';
  text: string;
}

export interface VoiceTranscriptSavedEntry {
  id: string;
  title: string;
  docType: DocType;
  confidence: number;
  action: 'created' | 'updated' | 'unchanged';
  chunksCount?: number;
}

export interface IngestVoiceTranscriptResponseData {
  /** Whether the topics were extracted by the model or by keyword fallback. */
  method: 'model' | 'heuristic';
  saved: VoiceTranscriptSavedEntry[];
  skippedTurns: number;
}
