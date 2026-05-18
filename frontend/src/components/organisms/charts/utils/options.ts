export const TIMEFRAMES = [
  { label: '1 min', value: '1Min' },
  { label: '5 min', value: '5Min' },
  { label: '15 min', value: '15Min' },
  { label: '30 min', value: '30Min' },
  { label: '1 hour', value: '1Hour' },
];

export const TIMEZONES = [
  { label: 'UTC', value: 'UTC' },
  { label: 'ET (New York)', value: 'America/New_York' },
  { label: 'CT (Chicago)', value: 'America/Chicago' },
  { label: 'PT (Los Angeles)', value: 'America/Los_Angeles' },
  { label: 'GMT (London)', value: 'Europe/London' },
  { label: 'CET (Paris)', value: 'Europe/Paris' },
  { label: 'IST (Mumbai)', value: 'Asia/Kolkata' },
  { label: 'JST (Tokyo)', value: 'Asia/Tokyo' },
  { label: 'HKT (Hong Kong)', value: 'Asia/Hong_Kong' },
];

export const CHART_TYPES = {
  Stock:      ['Candlestick', 'Bar', 'Line', 'Area', 'Baseline'],
  Volatility: ['Line', 'Area'],
  General:    ['Candlestick', 'Line', 'Area'],
} as const;

export const COMPARE_COLORS = ['#f59e0b', '#60a5fa', '#f472b6', '#34d399'];
