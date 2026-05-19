export { clerkAuth as apiClerkAuth } from './auth';
export { getCompanies, getTicker, getSparklines, runSimulation, getSimulationPresets } from '../features/tickers/api';
export { getCorrelationMatrix, getCorrelation } from '../features/correlations/api';
export { triggerJob, getAuditLog } from './admin';
export { streamResearch } from './research';
export {
  getPosts as getTrumpPosts,
  getPostsForTicker as getTrumpPostsForTicker,
  getCorrelation as getTrumpCorrelation,
  getLagImpact as getTrumpLagImpact,
} from '../features/social/api';
export { getPosts as getRedditPosts, getComments as getRedditComments } from './reddit';
export {
  getStatus as getThreatIntelStatus,
  getKev,
  getNvd,
  getOtx,
  getMisp,
  getList as getThreatIntelList,
  getCorrelation as getThreatIntelCorrelation,
} from '../features/threat-intel/api';
export { getAnalysis as getNewsAnalysis, analyze as analyzeNews, getCorrelation as getNewsCorrelation } from '../features/news/api';
export {
  getEntityArticles as getIntelligenceEntityArticles,
  getEntitySummary as getIntelligenceEntitySummary,
  getSignals as getIntelligenceSignals,
  getEntities as getIntelligenceEntities,
  getSentimentCorrelations as getIntelligenceSentimentCorrelations,
} from '../features/intelligence/api';
export {
  getTickers as getCyberNewsTickers,
  getSummary as getCyberNewsSummary,
  getArticles as getCyberNewsArticles,
  getTopics as getCyberNewsTopics,
  getRecent as getCyberNewsRecent,
  getCorrelations as getCyberNewsCorrelations,
} from '../features/news/api/cyber-news';
export { getBars as getAlpacaBars, getIntradayEvents } from '../features/charts/api';
