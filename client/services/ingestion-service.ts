import { apiClient } from '@/lib/api-client';
import {
  IngestionSummary,
  FeedIngestPayload,
  FeedIngestResponse,
  ManualIngestPayload,
  CrawlStorePayload,
  CrawlStoreResponse,
} from '@/types/ingestion';

export async function uploadProductFileApi(
  file: File,
  fieldMapping?: Record<string, string>,
): Promise<IngestionSummary> {
  const formData = new FormData();
  formData.append('file', file);
  if (fieldMapping && Object.keys(fieldMapping).length > 0) {
    formData.append('fieldMapping', JSON.stringify(fieldMapping));
  }

  return apiClient<IngestionSummary>('/ingestion/upload', {
    method: 'POST',
    body: formData,
  });
}

export async function ingestFeedApi(
  payload: FeedIngestPayload,
): Promise<FeedIngestResponse> {
  return apiClient<FeedIngestResponse>('/ingestion/feed', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function manualIngestApi(
  payload: ManualIngestPayload,
): Promise<any> {
  return apiClient<any>('/ingestion/manual', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function crawlStoreApi(
  payload: CrawlStorePayload,
): Promise<CrawlStoreResponse> {
  return apiClient<CrawlStoreResponse>('/ingestion/crawl-store', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

