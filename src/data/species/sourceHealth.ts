export type SourceHealthStatus = 'current' | 'changed' | 'review-due' | 'unreachable' | 'not-monitored';

export interface SourceHealthRecord {
  sourceId: string;
  status: SourceHealthStatus;
  httpStatus?: number;
  finalUrl?: string;
  checkedAt?: string;
  contentHash?: string;
  etag?: string;
  lastModified?: string;
  message?: string;
}

export interface SourceHealthManifest {
  generatedAt: string;
  reviewIntervalDays: number;
  sourceCount: number;
  records: Record<string, SourceHealthRecord>;
}

export function daysSince(value: string | undefined, now = new Date()): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return null;
  return Math.max(0, Math.floor((now.getTime() - timestamp) / 86400000));
}

export function localSourceHealth(accessedOn: string | undefined, reviewIntervalDays = 90): SourceHealthRecord {
  const age = daysSince(accessedOn);
  if (age == null) {
    return { sourceId: '', status: 'not-monitored', message: 'The source has no valid review date.' };
  }
  return {
    sourceId: '',
    status: age > reviewIntervalDays ? 'review-due' : 'current',
    checkedAt: accessedOn,
    message: age > reviewIntervalDays ? `Source review is ${age - reviewIntervalDays} day(s) overdue.` : 'Source review is within the current review window.',
  };
}

export function sourceHealthLabel(status: SourceHealthStatus): string {
  switch (status) {
    case 'current': return 'Current monitor check';
    case 'changed': return 'Source changed · review required';
    case 'review-due': return 'Review due';
    case 'unreachable': return 'Source unreachable';
    default: return 'Not yet monitored';
  }
}
