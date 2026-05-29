export declare const SUPPORTED_FORMS: readonly ["10-K", "10-K/A", "10-Q", "10-Q/A", "8-K", "8-K/A", "DEF 14A", "DEFA14A", "DEFM14A", "PRE 14A", "DEFR14A", "PREM14A", "3", "4", "5", "SC 13G", "SC 13G/A", "SC 13D", "SC 13D/A", "425", "SC TO-T", "SC TO-I", "S-4", "S-1", "S-1/A", "S-3", "S-3/A", "424B4", "424B3", "424B5", "FWP", "13F-HR", "13F-HR/A", "20-F", "20-F/A", "6-K", "40-F", "CORRESP", "UPLOAD", "EFFECT", "SD"];
export type FormType = typeof SUPPORTED_FORMS[number];
export declare function isSupportedForm(s: string): s is FormType;
export type FilingMetadata = {
    accession: string;
    cik: string;
    form: FormType;
    filingDate: string;
    reportDate?: string;
    acceptanceDateTime?: string;
    primaryDocument: string;
    primaryDocDescription?: string;
    items?: string[];
    isXBRL: boolean;
    isInlineXBRL: boolean;
    size: number;
};
export type InsiderFormType = '3' | '4' | '5' | '3/A' | '4/A' | '5/A';
export type Form4TransactionCode = 'P' | 'S' | 'A' | 'D' | 'F' | 'I' | 'M' | 'C' | 'E' | 'H' | 'O' | 'X' | 'G' | 'V' | 'J' | 'K' | 'L' | 'U' | 'W' | 'Z';
export type Form4Transaction = {
    table: 'nonDerivative' | 'derivative';
    securityTitle: string;
    transactionDate?: string;
    code: Form4TransactionCode | string;
    acquiredDisposed: 'A' | 'D' | null;
    shares: number | null;
    pricePerShare: number | null;
    priceFromFootnote: boolean;
    sharesOwnedAfter: number | null;
    directOrIndirect: 'D' | 'I' | null;
};
export type FilingPriceImpact = {
    open: number;
    close: number;
    deltaPct: number;
};
export type InsiderOwnerProfile = {
    isDirector: boolean;
    isOfficer: boolean;
    isTenPercentOwner: boolean;
    officerTitle?: string;
};
export type InsiderFiling = {
    accession: string;
    form: InsiderFormType;
    filingDate: string;
    ticker: string;
    issuerCik: string;
    reportPeriod?: string;
    transactions?: Form4Transaction[];
    priceImpact?: FilingPriceImpact | null;
    ownerProfile?: InsiderOwnerProfile;
};
export type InsiderRow = {
    personCik: string;
    name: string;
    companies: string[];
    filingCount: number;
    latestFilingDate: string;
};
export type InsiderCompanySummary = {
    ticker: string;
    insiderCount: number;
    latestFilingDate: string;
};
export type PersonDetail = {
    personCik: string;
    name: string;
    filingsByCompany: Record<string, InsiderFiling[]>;
    roles: InsiderOwnerProfile[];
};
export type InsiderImpactAggregate = {
    filingCount: number;
    withPriceData: number;
    buy: {
        count: number;
        avgDeltaPct: number | null;
    };
    sell: {
        count: number;
        avgDeltaPct: number | null;
    };
    other: {
        count: number;
        avgDeltaPct: number | null;
    };
    overall: {
        avgDeltaPct: number | null;
    };
    byCode: Record<string, {
        count: number;
        avgDeltaPct: number | null;
    }>;
};
export type InsiderLeaderboardRow = {
    personCik: string;
    name: string;
    companies: string[];
    filingCount: number;
    aggregate: InsiderImpactAggregate;
};
export type InsiderLeaderboardResponse = {
    rows: InsiderLeaderboardRow[];
    topCodes: string[];
};
export type User = {
    id: string;
    username: string;
    role: "user" | "admin";
    email?: string;
};
export type AuthResponse = {
    token: string;
    user: User;
};
export type Quote = {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    adjclose?: number;
    volume?: number;
};
export type SparklineEntry = {
    closes: number[];
    dates: string[];
    latestPrice: number | null;
    changePct: number | null;
};
export type SparklineMap = Record<string, SparklineEntry>;
export type CorrelationMatrixData = {
    tickers: string[];
    names: string[];
    matrix: Record<string, Record<string, number>>;
    lagDays: number;
};
export type RollingCorrelation = {
    index: number;
    date: string | null;
    r: number;
    pValue: number;
};
export type CorrelationResult = {
    r: number;
    pValue: number;
    significant: boolean;
    /** 95% confidence interval [lower, upper] — always present */
    ci: [number, number];
    n: number;
    lagDays: number;
    source: string;
    interpretation: string;
    rolling?: RollingCorrelation[];
};
export type LagBucket = {
    n: number;
    avgChangePct: number | null;
};
export type LagImpactResult = {
    windowDays: number;
    positive: LagBucket;
    negative: LagBucket;
    neutral: LagBucket;
};
export type CorrelationWithImpact = {
    correlation: CorrelationResult;
    lagImpact: LagImpactResult;
};
export type SimulationAction = {
    date: string;
    type: "buy" | "sell";
    value: number;
};
export type SimulationPresetEntry = {
    date: string;
    number: number;
};
/** Backend returns a map of strategy name → preset entries */
export type SimulationPresets = Record<string, SimulationPresetEntry[]>;
export type SimulationTransaction = {
    date: string;
    type: "buy" | "sell";
    shares: number;
    price: number;
    value: number;
    sharesAfter: number;
    portfolioValue: number;
};
export type PortfolioDataPoint = {
    date: string;
    value: number;
};
export type SimulationResult = {
    finalCash: number;
    finalShares: number;
    sharesValue: number;
    cashWithdrawn: number;
    finalPortfolioValue: number;
    totalInvested: number;
    profit: number;
    profitPercent: string;
    transactions: SimulationTransaction[];
    portfolioHistory: PortfolioDataPoint[];
    priceHistory: PortfolioDataPoint[];
};
export type SentimentAnalysis = {
    sentiment: number;
    importance?: number;
    relevance?: number;
    catalyst?: boolean;
    timeframe?: string;
    topics?: string[];
    summary?: string;
    entities?: Array<{
        name: string;
        [key: string]: unknown;
    }>;
};
export type NewsAnalysisMap = Record<string, SentimentAnalysis>;
export type UrgencyKey = "now" | "today" | "recent" | "future_short" | "future_long" | "past";
export type NewsArticle = {
    id?: string;
    title?: string;
    link: string;
    publisher?: string;
    source?: string;
    providerPublishTime?: number | string;
    publishedAt?: string;
    timestamp?: string | number;
    urgency?: UrgencyKey;
    analysis?: SentimentAnalysis;
    allMatches?: Array<{
        ticker: string;
        company: string;
    }>;
    matchedTicker?: string;
    globalSignals?: string[];
    companySignals?: string[];
};
export type NewsAnalyzeQueuedResponse = {
    queued: number;
    total?: number;
};
export type StockAnalysis = {
    trend?: string;
    momentum?: string;
    volatility?: string;
};
export type TickerSummary = {
    summaryProfile?: {
        sector?: string;
        industry?: string;
        country?: string;
        fullTimeEmployees?: number;
        website?: string;
        longBusinessSummary?: string;
    };
    financialData?: Record<string, unknown>;
    defaultKeyStatistics?: Record<string, unknown>;
    [key: string]: unknown;
};
export type TickerData = {
    history: {
        quotes: Quote[];
    };
    news?: NewsArticle[];
    summary?: TickerSummary;
    analysis?: StockAnalysis;
};
export type TrumpPost = {
    id: string;
    created_at: string;
    content: string;
    url?: string;
    sentiment?: string;
    tags?: string[];
    analyzed_at?: string;
};
export type ThreatIntelItem = {
    cveId?: string;
    cveID?: string;
    cveURL?: string;
    description?: string;
    severity?: string;
    created?: string;
    vendorProject?: string;
    product?: string;
    vulnerabilityName?: string;
    name?: string;
    company?: string;
    ransomware?: string;
    [key: string]: unknown;
};
export type ThreatIntelListResponse = {
    items: ThreatIntelItem[];
    total: number;
    syncedAt?: string;
    configured?: boolean;
};
export type KevStatus = {
    count: number;
    syncedAt: string | null;
    recentCount: number;
    ransomwareCount: number;
};
export type NvdStatus = {
    fetched: number;
    syncedAt: string | null;
    criticalCount: number;
    highCount: number;
};
export type OtxStatus = {
    configured: boolean;
    count: number | null;
    syncedAt: string | null;
};
export type ThreatIntelStatus = {
    kev: KevStatus;
    nvd: NvdStatus;
    otx: OtxStatus;
    misp: OtxStatus;
};
export type AuditEntry = {
    id: string;
    userId: string;
    username: string;
    action: string;
    meta: Record<string, unknown>;
    timestamp: string;
};
export type PaginatedAudit = {
    total: number;
    entries: AuditEntry[];
};
type IntelligenceArticleEntity = {
    entityId: string;
    name: string;
    role: string;
    score: number;
    sentiment: number;
};
export type IntelligenceArticle = NewsArticle & {
    entities: IntelligenceArticleEntity[];
    newsType: string;
};
export type IntelligenceEntity = {
    entityId: string;
    name: string;
    count?: number;
};
export type IntelligenceSignal = {
    signalType: string;
    count: number;
};
export type IntelligenceEntitySummary = {
    avgSentiment: number;
    articleCount?: number;
    positiveCount?: number;
    negativeCount?: number;
    neutralCount?: number;
    count?: number;
    [key: string]: unknown;
};
export type SentimentCorrelationEntry = {
    ticker: string;
    correlation: CorrelationResult;
    lagImpact?: LagImpactResult;
};
export type CyberNewsTicker = {
    ticker: string;
    company: string;
    count?: number;
};
export type CyberNewsSummary = {
    avgSentiment: number;
    articleCount?: number;
    positiveCount?: number;
    negativeCount?: number;
    neutralCount?: number;
    [key: string]: unknown;
};
export type CyberNewsTopic = {
    topic: string;
    count?: number;
};
export type CyberNewsCorrelationEntry = {
    ticker: string;
    correlation: CorrelationResult;
    lagImpact?: LagImpactResult;
};
export type RedditPost = {
    id: string;
    title: string;
    text?: string;
    score?: number;
    url?: string;
    createdAt?: string;
    author?: string;
    numComments?: number;
};
export type RedditComment = {
    id: string;
    body: string;
    score?: number;
    author?: string;
    created_utc?: number;
    replies?: RedditComment[];
};
export type AlpacaBar = {
    t: string;
    o: number;
    h: number;
    l: number;
    c: number;
    v: number;
    n: number;
    vw: number;
};
export type AlpacaBarsResponse = {
    bars: AlpacaBar[];
    symbol: string;
};
export type ResearchSection = {
    title: string;
    text: string;
};
export type ChatMessage = {
    role: "user" | "assistant";
    content: string;
};
export type AppNotification = {
    id: string;
    type: string;
    read: boolean;
    title?: string;
    message?: string;
    [key: string]: unknown;
};
export {};
//# sourceMappingURL=types.d.ts.map