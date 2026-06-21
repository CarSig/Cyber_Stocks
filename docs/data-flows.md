# Data Flows

Key end-to-end flows through the system.

---

## Stock Price Sync

```
Cron (23:00 UTC daily)
  → runPopulate()
  → CybersecurityClient.populate() for each company
      → queries MAX(date) from stock_quotes to find resume point
      → fetches incremental chart data from Yahoo Finance
      → upserts meta into stock_meta (ticker PK, JSONB)
      → upserts quotes into stock_quotes (ticker+date PK, OHLCV)
      → upserts news into company_news
      → upserts summary into company_summary
      → busts in-memory historyCache for the company
  → emits stocks.updated on eventBus
  → SSE clients receive { tickers: [{ ticker, changePct }] }
  → NotificationContext → NotificationBell updates badge

historyCache: in-memory Map<companyName, {data, expiresAt}> with 24h TTL.
CybersecurityConsumer.history() reads from cache or queries
  stock_meta + stock_quotes and repopulates cache.
```

---

## News Analysis Pipeline

```
User clicks "Analyze" on Ticker page
  → useNewsAnalysis.analyze() → POST /news-analyze/:ticker
  → NewsAnalysisService.analyzeForTicker()
      → reads news articles from YahooCompanyClient
      → filters out links already in news-queued.json
      → publishes each article to RabbitMQ (news.articles queue)
      → appends links to news-queued.json
  → returns { queued, total }

Frontend starts polling GET /news-analysis/:ticker every 3s

newsWorker.ts (separate process, always running):
  ← consumes from news.articles queue
  → calls ollamaAnalyzer(article, company)
      → Ollama LLM returns { sentiment, importance, relevance }
  → appends result to storage/<Company>/news-analysis.json
  → publishes to news.analyzed queue

newsAnalyzedConsumer.ts (started in server.ts):
  ← consumes from news.analyzed queue
  → NotificationService.broadcast({ type: "news.analyzed", ticker, title, sentiment })

Frontend:
  → polling detects analysis count increase → updates news list
  → SSE notification → NotificationBell shows badge
  → polling stops when queuedCount reaches 0
  → auto-invalidates news-correlation query
```

---

## Stock-to-Stock Correlation

```
User selects compare ticker on Ticker page
  → useCorrelation(tickerA, tickerB, period, lagDays)
  → GET /correlate/:tickerA/:tickerB?windowDays=&lagDays=

Server:
  → StockService.correlate(nameA, nameB, windowDays, lagDays)
  → fetches quotes for both tickers from storage
  → aligns date ranges
  → shifts series B by lagDays (positive = B lags A)
  → calculates Pearson r over aligned close prices
  → calculates rolling 30-day correlations
  → computes p-value, 95% CI
  → returns CorrelationResult

Frontend → CorrelationBox renders stats + rolling chart
```

---

## Trump Correlation

```
Cron (hourly):
  → runFetchTrump()
  → fetches new Trump posts from source API
  → appends to storage/socials/trump_posts.json (raw)
  → analyzed_posts.json updated separately (Claude API call on each post)
  → emits trump.updated on eventBus → SSE clients notified

User views Ticker page:
  → useTrump(ticker) → GET /trump-posts/:ticker
  → filters posts where analysis.companies includes ticker
  → hasData = posts.length > 0

User requests correlation:
  → GET /correlate-trump/:ticker?lagDays=N
  → TrumpService.getCorrelation(companyName, ticker, lagDays)
      → loads posts + stock quotes
      → treats each post date as an event
      → calls correlateTrump() utility
      → returns CorrelationResult + LagImpactResult
  → CorrelationBox displays r, p-value, lag impact buckets
```

---

## Threat Intel Correlation

```
Cron (06:00 UTC daily):
  → runThreatIntelSync()
  → fetches CISA KEV (full dataset, JSON)
  → fetches NVD CVEs (paged, JSON API)
  → fetches OTX pulses (API)
  → fetches MISP events (if MISP_URL set)
  → writes to storage/threat-intel/*.json
  → emits threatintel.updated with change counts

User views Ticker page:
  → useThreatIntel(ticker) → queries NVD, KEV, OTX correlations
  → each: GET /threat-intel/correlate/:source/:ticker?lagDays=N
  → ThreatIntelService.correlate<Source>(ticker, lagDays)
      → loads source data
      → filters events mentioning ticker via vendor keywords / CPE strings
      → requires ≥ 4 events
      → calls threatIntelCorrelation() utility
      → returns CorrelationResult + LagImpactResult
  → three CorrelationBox tabs rendered (NVD / KEV / OTX)
```

---

## Market Research Stream

```
User clicks "Run Research" on Ticker page
  → useResearch.run() → GET /research/:ticker?token=

Server:
  → ResearchService.streamResearch(ticker, name, emit)
  → Section 1: "Latest News"
      → Tavily.search("CRWD CrowdStrike latest news")
      → Claude Haiku summarizes results
      → streams text chunks via SSE
  → Section 2: "Analyst Outlook" (same pattern)
  → Section 3: "Competitive Landscape" (same pattern)
  → emits { done: true }

Frontend:
  → sections array grows as SSE events arrive
  → each section rendered as it streams in
```

---

## Chat

```
User types message in Chat sidebar
  → POST /chat { message, history, context }
  → ResearchService.streamChat(messages, context, emit)
  → Claude with system prompt (includes ticker context + simulation result)
  → if model calls web_search tool:
      → Tavily.search(query)
      → re-runs Claude with tool result
  → streams text via SSE
  → final event includes updated messages array

Frontend:
  → appends assistant message to local history
  → next send includes updated history
```

---

## News Intelligence & Urgency Classification

```
Backend pipeline (content-analysis module):
  → articles fetched via RSS/API → parsed into backend_articles table
  → EntityService extracts mentions (NLP) → backend_entity_mentions, backend_entities
  → SentimentService scores each entity mention (embedding-based) → stored in join table
  → global/company signals extracted and stored separately
  → timestamp preserved on each article

Frontend (Intelligence2 page):
  → useEntityIntelligence(entityId, signal) → queries articles + summary
  → each article has: timestamp, globalSignals[], companySignals[], entities[]
  
Urgency classification (client-side in Intelligence2.jsx):
  → classifyUrgency(timestamp, globalSignals, companySignals) →
      ├─ ≤ 2h old       → "now"
      ├─ ≤ 24h old      → "today"
      ├─ ≤ 7d old       → "recent" (if no forward-looking signals)
      └─ > 7d old OR forward-looking signals
          ├─ contains long-term keywords (annual, year, decade, etc)  → "future_long"
          └─ forward-looking but short-term (week, month, quarter)   → "future_short"
  
  Forward-looking keywords: outlook, forecast, guidance, upcoming, scheduled, etc.
  Long-term keywords: annual, yearly, year, multi-year, long-term, 5-year, decade

Frontend UI:
  → EntityDetailPanel shows article list with UrgencyBadge + filter tabs (All / Now / Today / Recent / Future–Short / Future–Long)
  → articles sorted by urgency order within filtered view
  → filter state local to drawer, no server roundtrip required
```
