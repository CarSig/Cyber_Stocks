const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const BASE = isLocalhost
  ? "http://localhost:3000"
  : (import.meta.env.VITE_API_URL ?? "http://localhost:3000");

function authHeader() {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { ...authHeader(), "ngrok-skip-browser-warning": "1", ...opts.headers },
  });
  if (res.status === 401) {
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export function apiClerkAuth(clerkToken) {
  return apiFetch("/auth/clerk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: clerkToken }),
  });
}

// ── Data ──────────────────────────────────────────────────────────────────────

export function getCompanies() {
  return apiFetch("/");
}

export function getTicker(ticker) {
  return apiFetch(`/${ticker}`);
}

export function getSparklines(tickers) {
  if (!tickers?.length) return Promise.resolve({});
  return apiFetch(`/sparklines?tickers=${tickers.join(",")}`);
}

export async function runSimulation(ticker, actions) {
  return apiFetch(`/simulate/${ticker}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ actions }),
  });
}

export function streamResearch(ticker, onSection, onText, onDone, onError) {
  const token = localStorage.getItem("auth_token") ?? "";
  const es = new EventSource(`${BASE}/research/${ticker}?token=${encodeURIComponent(token)}`);
  es.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.section) onSection(msg.section);
    else if (msg.text) onText(msg.text);
    else if (msg.sectionDone) onText("\n\n");
    else if (msg.done) { onDone(); es.close(); }
    else if (msg.error) { onError(msg.error); es.close(); }
  };
  es.onerror = () => { onError("Connection error"); es.close(); };
  return () => es.close();
}

export function getSimulationPresets(ticker) {
  return apiFetch(`/simulation-presets/${ticker}`);
}

export function getTrumpPosts() {
  return apiFetch("/trump-posts");
}

export function getRedditPosts(subreddit) {
  return apiFetch(`/reddit-posts?subreddit=${encodeURIComponent(subreddit)}`);
}

export function getRedditComments(subreddit, id) {
  return apiFetch(`/reddit-comments/${encodeURIComponent(subreddit)}/${encodeURIComponent(id)}`);
}

export function getTrumpPostsForTicker(ticker) {
  return apiFetch(`/trump-posts/${ticker}`);
}

export function getTrumpCorrelation(ticker, lagDays = 1) {
  return apiFetch(`/correlate-trump/${ticker}?lagDays=${lagDays}`);
}

export function getTrumpLagImpact(ticker, lagDays = 7) {
  return apiFetch(`/trump-lag-impact/${ticker}?lagDays=${lagDays}`);
}

export function getCorrelationMatrix({ lagDays = 0, windowDays = 90, startDate, endDate } = {}) {
  const p = new URLSearchParams({ lagDays, windowDays });
  if (startDate) p.set("startDate", startDate);
  if (endDate) p.set("endDate", endDate);
  return apiFetch(`/correlation-matrix?${p}`);
}

export function getCorrelation(tickerA, tickerB, windowDays, lagDays) {
  const p = new URLSearchParams();
  if (windowDays) p.set("windowDays", windowDays);
  if (lagDays != null) p.set("lagDays", lagDays);
  const qs = p.toString() ? `?${p}` : "";
  return apiFetch(`/correlate/${tickerA}/${tickerB}${qs}`);
}

export function triggerJob(job) {
  return apiFetch(`/admin/trigger/${job}`, { method: "POST" });
}

export function getAuditLog({ limit = 100, offset = 0, userId, action } = {}) {
  const params = new URLSearchParams({ limit, offset });
  if (userId) params.set("userId", userId);
  if (action) params.set("action", action);
  return apiFetch(`/admin/audit?${params}`);
}

// ── Threat Intel ──────────────────────────────────────────────────────────────

export function getThreatIntelStatus() {
  return apiFetch("/threat-intel/status");
}

export function getKev(opts)  { return getThreatIntelList("kev",  opts); }
export function getNvd(opts)  { return getThreatIntelList("nvd",  opts); }
export function getOtx(opts)  { return getThreatIntelList("otx",  opts); }
export function getMisp(opts) { return getThreatIntelList("misp", opts); }

export function getThreatIntelList(source, { limit = 50, offset = 0, search = "", ransomware = "", severity = "", company = "" } = {}) {
  const params = new URLSearchParams({ limit, offset });
  if (search) params.set("search", search);
  if (ransomware) params.set("ransomware", ransomware);
  if (severity) params.set("severity", severity);
  if (company) params.set("company", company);
  return apiFetch(`/threat-intel/list/${source}?${params}`);
}

export function getThreatIntelCorrelation(source, ticker, lagDays = 1) {
  return apiFetch(`/threat-intel/correlate/${source}/${ticker}?lagDays=${lagDays}`);
}

// ── News Analysis ─────────────────────────────────────────────────────────────

export function getNewsAnalysis(ticker) {
  return apiFetch(`/news-analysis/${ticker}`);
}

export function analyzeNews(ticker) {
  return apiFetch(`/news-analyze/${ticker}`, { method: "POST" });
}

export function getNewsCorrelation(ticker, lagDays = 1) {
  return apiFetch(`/news-correlation/${ticker}?lagDays=${lagDays}`);
}

// ── Intelligence ──────────────────────────────────────────────────────────────

export function getIntelligenceEntityArticles(entityId, signal) {
  const qs = signal ? `?signal=${encodeURIComponent(signal)}` : "";
  return apiFetch(`/intelligence/entities/${encodeURIComponent(entityId)}/articles${qs}`);
}

export function getIntelligenceEntitySummary(entityId, signal) {
  const qs = signal ? `?signal=${encodeURIComponent(signal)}` : "";
  return apiFetch(`/intelligence/entities/${encodeURIComponent(entityId)}/summary${qs}`);
}

export function getIntelligenceSignals() {
  return apiFetch("/intelligence/signals");
}

export function getIntelligenceEntities() {
  return apiFetch("/intelligence/entities");
}

export function getIntelligenceSentimentCorrelations(lagDays = 1, signal) {
  const qs = new URLSearchParams({ lagDays });
  if (signal) qs.set("signal", signal);
  return apiFetch(`/intelligence/sentiment-correlations?${qs}`);
}

// ── Cyber News ────────────────────────────────────────────────────────────────

export function getCyberNewsTickers(topic) {
  const qs = topic ? `?topic=${encodeURIComponent(topic)}` : "";
  return apiFetch(`/cyber-news/tickers${qs}`);
}

export function getCyberNewsSummary(ticker, topic) {
  const qs = topic ? `?topic=${encodeURIComponent(topic)}` : "";
  return apiFetch(`/cyber-news/${ticker}/summary${qs}`);
}

export function getCyberNewsArticles(ticker, topic) {
  const qs = topic ? `?topic=${encodeURIComponent(topic)}` : "";
  return apiFetch(`/cyber-news/${ticker}/articles${qs}`);
}

export function getCyberNewsTopics() {
  return apiFetch("/cyber-news/topics");
}

export function getCyberNewsRecent(limit = 50) {
  return apiFetch(`/cyber-news/recent?limit=${limit}`);
}

export function getCyberNewsCorrelations(lagDays = 1, topic) {
  const qs = new URLSearchParams({ lagDays });
  if (topic) qs.set("topic", topic);
  return apiFetch(`/cyber-news/correlations?${qs}`);
}

