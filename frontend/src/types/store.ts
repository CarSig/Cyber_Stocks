export type TickerState = {
  activeTab: string;
  compareTicker: string | null;
  period: number | null;
  visibleRange: { from: string; to: string } | null;
  correlagDays: number;
  showChat: boolean;
  showWatchlist: boolean;
  showTrump: boolean;
  showNvd: boolean;
  showOtx: boolean;
  showKev: boolean;
  showNews: boolean;
  hidePrice: boolean;
  hideVolatility: boolean;
  hideNewsSentiment: boolean;
  hideIntelligence: boolean;
  showCyberNews: boolean;
  hideCyberNewsSentiment: boolean;
};

export type TickerActions = {
  setActiveTab: (v: string) => void;
  setCompareTicker: (v: string | null) => void;
  setPeriod: (v: number | null) => void;
  setVisibleRange: (v: { from: string; to: string } | null) => void;
  setCorrelagDays: (v: number) => void;
  setShowChat: (v: boolean | ((prev: boolean) => boolean)) => void;
  setShowWatchlist: (v: boolean | ((prev: boolean) => boolean)) => void;
  setShowTrump: (v: boolean) => void;
  setShowNvd: (v: boolean) => void;
  setShowOtx: (v: boolean) => void;
  setShowKev: (v: boolean) => void;
  setShowNews: (v: boolean) => void;
  setHidePrice: (v: boolean) => void;
  setHideVolatility: (v: boolean) => void;
  setHideNewsSentiment: (v: boolean) => void;
  setHideIntelligence: (v: boolean) => void;
  setShowCyberNews: (v: boolean) => void;
  setHideCyberNewsSentiment: (v: boolean) => void;
  reset: () => void;
};

export type TickerStore = TickerState & TickerActions;
