import type { NodeCategory } from './types';

export const NODE_WIDTH = 148;
export const NODE_HEIGHT = 58;

export const CATEGORY_COLOR: Record<NodeCategory, string> = {
  root:  'var(--color-blue, #3b82f6)',
  hub:   'var(--accent-color, #a855f7)',
  leaf:  'var(--color-green, #22c55e)',
  auth:  'var(--muted-foreground, #71717a)',
  admin: 'var(--color-amber, #f59e0b)',
};

export const DATA_FLOW_LABELS: Record<string, string> = {
  'stock-price-sync':          'Stock Price Sync',
  'news-analysis-pipeline':    'News Analysis Pipeline',
  'stock-to-stock-correlation':'Stock-to-Stock Correlation',
  'trump-correlation':         'Trump Correlation',
  'threat-intel-correlation':  'Threat Intel Correlation',
  'market-research-stream':    'Market Research Stream',
  'chat':                      'AI Chat',
  'news-intelligence':         'News Intelligence',
};
