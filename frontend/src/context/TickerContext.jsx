import { createContext, useContext, useState } from "react";

const TickerContext = createContext(null);

export function TickerProvider({ children }) {
  const [activeTab, setActiveTab] = useState("charts");
  const [compareTicker, setCompareTicker] = useState("");
  const [period, setPeriod] = useState(null);
  const [visibleRange, setVisibleRange] = useState(null);
  const [correlagDays, setCorrelagDays] = useState(1);
  const [showChat, setShowChat] = useState(false);
  const [showWatchlist, setShowWatchlist] = useState(true);
  const [showTrump, setShowTrump] = useState(false);
  const [showNvd, setShowNvd] = useState(false);
  const [showOtx, setShowOtx] = useState(false);
  const [showKev, setShowKev] = useState(false);
  const [showNews, setShowNews] = useState(false);
  const [hidePrice, setHidePrice] = useState(false);
  const [hideVolatility, setHideVolatility] = useState(false);
  const [hideNewsSentiment, setHideNewsSentiment] = useState(false);
  const [hideIntelligence, setHideIntelligence] = useState(false);

  const value = {
    activeTab,
    setActiveTab,
    compareTicker,
    setCompareTicker,
    period,
    setPeriod,
    visibleRange,
    setVisibleRange,
    correlagDays,
    setCorrelagDays,
    showChat,
    setShowChat,
    showWatchlist,
    setShowWatchlist,
    showTrump,
    setShowTrump,
    showNvd,
    setShowNvd,
    showOtx,
    setShowOtx,
    showKev,
    setShowKev,
    showNews,
    setShowNews,
    hidePrice,
    setHidePrice,
    hideVolatility,
    setHideVolatility,
    hideNewsSentiment,
    setHideNewsSentiment,
    hideIntelligence,
    setHideIntelligence,
  };

  return <TickerContext.Provider value={value}>{children}</TickerContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTickerContext() {
  const context = useContext(TickerContext);
  if (!context) {
    throw new Error("useTickerContext must be used within TickerProvider");
  }
  return context;
}
