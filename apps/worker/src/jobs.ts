import { callGateway } from './gateway-client.js';

export const JOB_STORAGE_CLEANUP = 'storage.cleanup-expired-sessions';
export const JOB_STORAGE_RECONCILE = 'storage.reconcile-quota';
export const JOB_SEARCH_REINDEX = 'search.reindex';

export interface JobResult {
  name: string;
  ok: boolean;
  status: number;
  data: unknown;
}

export async function cleanupStorage(): Promise<JobResult> {
  const result = await callGateway('POST', '/gateway/internal/storage/cleanup');
  return { name: JOB_STORAGE_CLEANUP, ...result };
}

export async function reconcileQuota(): Promise<JobResult> {
  const result = await callGateway('POST', '/gateway/internal/storage/reconcile');
  return { name: JOB_STORAGE_RECONCILE, ...result };
}

export async function reindexSearch(): Promise<JobResult> {
  const result = await callGateway('POST', '/gateway/internal/search/reindex');
  return { name: JOB_SEARCH_REINDEX, ...result };
}

export const handlers: Record<string, () => Promise<JobResult>> = {
  [JOB_STORAGE_CLEANUP]: cleanupStorage,
  [JOB_STORAGE_RECONCILE]: reconcileQuota,
  [JOB_SEARCH_REINDEX]: reindexSearch,
};
