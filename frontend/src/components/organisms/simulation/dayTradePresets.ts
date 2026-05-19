export const DAYTRADE_PRESETS: Record<string, { time: string; side: 'buy' | 'sell'; value: number }[]> = {
  'Open & Close': [
    { time: '09:30', side: 'buy', value: 100 },
    { time: '15:45', side: 'sell', value: 100 },
  ],
  'Buy open, sell mid': [
    { time: '09:30', side: 'buy', value: 100 },
    { time: '12:00', side: 'sell', value: 100 },
  ],
  'Morning momentum': [
    { time: '09:30', side: 'buy', value: 100 },
    { time: '10:00', side: 'sell', value: 50 },
    { time: '10:30', side: 'sell', value: 100 },
  ],
  'Scalp open': [
    { time: '09:31', side: 'buy', value: 100 },
    { time: '09:45', side: 'sell', value: 100 },
  ],
  'Afternoon fade': [
    { time: '13:00', side: 'buy', value: 100 },
    { time: '15:30', side: 'sell', value: 100 },
  ],
};
