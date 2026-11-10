import { rankingTimeZone } from '@/features/workspace/domain/ranking';

export type DailyActivity = {
  id: string;
  name: string;
  platform: string;
  format: string;
  points: number;
  dailyLimit: number;
  active: boolean;
  rules: string;
  submissionStatus?: string | null;
};

/** The business day used by both the limit check and moderation reports. */
export function brasiliaDate(value: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: rankingTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(value);
}

export function dailyActivitySlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 36);
}
