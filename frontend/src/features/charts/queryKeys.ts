export const chartKeys = {
  bars: (ticker: string, date: string, timeframe: string) => ['alpaca-bars', ticker, date, timeframe] as const,
  intradayEvents: () => ['intraday-events'] as const,
};
