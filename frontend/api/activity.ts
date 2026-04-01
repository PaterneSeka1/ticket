import { apiRequest } from './client';
import type { ActivityLogEntry } from './types';

interface FetchActivityLogsOptions {
  limit?: number;
  action?: string;
  search?: string;
}

export async function fetchActivityLogs(options: FetchActivityLogsOptions = {}) {
  const params = new URLSearchParams();
  if (options.limit !== undefined) {
    params.set('limit', String(options.limit));
  }
  if (options.action) {
    params.set('action', options.action);
  }
  if (options.search) {
    params.set('search', options.search);
  }
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest<ActivityLogEntry[]>(`/activity/logs${query}`);
}
