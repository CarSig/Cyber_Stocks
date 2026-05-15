import type { UrgencyKey, UrgencyConfig } from '@/types';

const FUTURE_KEYWORDS = [
  'outlook',
  'forecast',
  'guidance',
  'upcoming',
  'scheduled',
  'projected',
  'expected',
  'planned',
  'will',
  'q1',
  'q2',
  'q3',
  'q4',
];

const LONG_TERM_KEYWORDS = ['annual', 'yearly', 'year', 'multi-year', 'long-term', '5-year', 'decade', '2025', '2026'];

const PAST_KEYWORDS = [
  'reported',
  'announced',
  'disclosed',
  'released',
  'posted',
  'filed',
  'completed',
  'finished',
  'ended',
  'breach',
  'compromised',
];

const NOW_KEYWORDS = ['breaking', 'alert', 'emergency', 'just', 'now', 'today', 'tonight', 'live'];

export function classifyUrgency(
  timestamp: string | number,
  globalSignals: string[] = [],
  companySignals: string[] = [],
): UrgencyKey {
  const articleDate = new Date(timestamp);
  const ageMs = Date.now() - articleDate.getTime();

  const TWO_HOURS = 2 * 60 * 60 * 1000;
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const SEVEN_DAYS = 7 * ONE_DAY;

  const allSignals = [...(globalSignals || []), ...(companySignals || [])].map((s) => String(s).toLowerCase());

  const hasNow = allSignals.some((s) => NOW_KEYWORDS.some((kw) => s.includes(kw)));
  if (hasNow) return 'now';

  const hasPast = allSignals.some((s) => PAST_KEYWORDS.some((kw) => s.includes(kw)));
  if (hasPast) return 'past';

  const hasFuture = allSignals.some((s) => FUTURE_KEYWORDS.some((kw) => s.includes(kw)));

  if (hasFuture) {
    const isLongTerm = allSignals.some((s) => LONG_TERM_KEYWORDS.some((kw) => s.includes(kw)));
    return isLongTerm ? 'future_long' : 'future_short';
  }

  if (ageMs <= TWO_HOURS) return 'now';
  if (ageMs <= ONE_DAY) return 'today';
  if (ageMs <= SEVEN_DAYS) return 'recent';

  return 'recent';
}

export const URGENCY_CONFIG: Record<UrgencyKey, UrgencyConfig> = {
  now: { label: 'Now', color: '#ef4444', bg: 'rgba(239,68,68,0.15)', order: 0 },
  today: { label: 'Today', color: '#f97316', bg: 'rgba(249,115,22,0.15)', order: 1 },
  recent: { label: 'Recent', color: '#eab308', bg: 'rgba(234,179,8,0.15)', order: 2 },
  future_short: { label: 'Future – Short', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', order: 3 },
  future_long: { label: 'Future – Long', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)', order: 4 },
  past: { label: 'Past', color: '#6b7280', bg: 'rgba(107,114,128,0.15)', order: 5 },
};
