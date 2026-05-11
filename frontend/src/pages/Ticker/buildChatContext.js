function fmt(n, prefix = "") {
  if (n == null) return "N/A";
  if (n >= 1e12) return `${prefix}${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `${prefix}${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `${prefix}${(n / 1e6).toFixed(2)}M`;
  return `${prefix}${n.toLocaleString()}`;
}

function pct(n) {
  if (n == null) return "N/A";
  return `${n >= 0 ? "+" : ""}${(n * 100).toFixed(2)}%`;
}

function corrLine(label, corr, lagImpact) {
  if (!corr && !lagImpact) return null;
  const parts = [];
  if (corr?.r != null) parts.push(`r=${corr.r.toFixed(3)} (p=${corr.p?.toFixed(3) ?? "N/A"}, n=${corr.n ?? "N/A"})`);
  if (lagImpact?.avgReturn != null) parts.push(`avg return after event: ${pct(lagImpact.avgReturn)} over ${lagImpact.lagDays ?? "?"}d`);
  return parts.length ? `${label}: ${parts.join(", ")}` : null;
}

export function buildChatContext({
  ticker, summary, periodAnalysis, newsArticles, newsAnalysisData,
  simulationResult, researchSections,
  trump, nvdData, otxData, kevData,
  threatIntel, correlationData, compareTicker,
  intelligenceArticles, allQuotes,
}) {
  const ks  = summary?.defaultKeyStatistics;
  const fd  = summary?.financialData;
  const sp  = summary?.summaryProfile;
  const sd  = summary?.summaryDetail;
  const inc = summary?.incomeStatementHistory?.incomeStatementHistory?.[0];
  const bs  = summary?.balanceSheetHistory?.balanceSheetStatements?.[0];
  const cf  = summary?.cashflowStatementHistory?.cashflowStatements?.[0];
  const earn = summary?.earnings;

  // --- Price / quote snapshot ---
  const sorted = allQuotes?.length ? [...allQuotes].sort((a, b) => a.date.localeCompare(b.date)) : [];
  const last = sorted.at(-1);
  const prev = sorted.at(-2);
  const dayChange = last && prev ? pct((last.close - prev.close) / prev.close) : "N/A";

  const lines = [];

  // Identity
  lines.push(`=== ${ticker} — ${summary?.price?.longName ?? ticker} ===`);
  lines.push(`Sector: ${sp?.sector ?? "N/A"} | Industry: ${sp?.industry ?? "N/A"}`);
  lines.push(`Country: ${sp?.country ?? "N/A"} | Employees: ${sp?.fullTimeEmployees?.toLocaleString() ?? "N/A"}`);
  if (sp?.longBusinessSummary) lines.push(`Business: ${sp.longBusinessSummary.slice(0, 400)}…`);

  // Price
  lines.push(`\n--- Price ---`);
  lines.push(`Current: $${fd?.currentPrice?.toFixed(2) ?? last?.close?.toFixed(2) ?? "N/A"} | Day change: ${dayChange}`);
  lines.push(`52w High: $${sd?.fiftyTwoWeekHigh?.toFixed(2) ?? "N/A"} | 52w Low: $${sd?.fiftyTwoWeekLow?.toFixed(2) ?? "N/A"}`);
  lines.push(`50d MA: $${sd?.fiftyDayAverage?.toFixed(2) ?? "N/A"} | 200d MA: $${sd?.twoHundredDayAverage?.toFixed(2) ?? "N/A"}`);
  lines.push(`Volume: ${fmt(last?.volume)} | Avg volume: ${fmt(sd?.averageVolume)}`);
  lines.push(`Beta: ${ks?.beta?.toFixed(2) ?? "N/A"}`);

  // Valuation
  lines.push(`\n--- Valuation ---`);
  const shares = ks?.sharesOutstanding;
  const price  = fd?.currentPrice;
  const mcap   = price != null && shares != null ? price * shares : sd?.marketCap;
  lines.push(`Market Cap: ${fmt(mcap, "$")}`);
  lines.push(`P/E (trailing): ${sd?.trailingPE?.toFixed(2) ?? "N/A"} | P/E (forward): ${sd?.forwardPE?.toFixed(2) ?? "N/A"}`);
  lines.push(`PEG: ${ks?.pegRatio?.toFixed(2) ?? "N/A"} | P/B: ${ks?.priceToBook?.toFixed(2) ?? "N/A"}`);
  lines.push(`EV/Revenue: ${ks?.enterpriseToRevenue?.toFixed(2) ?? "N/A"} | EV/EBITDA: ${ks?.enterpriseToEbitda?.toFixed(2) ?? "N/A"}`);
  lines.push(`Dividend yield: ${sd?.dividendYield != null ? pct(sd.dividendYield) : "N/A"}`);

  // Financials
  lines.push(`\n--- Financials ---`);
  lines.push(`Revenue: ${fmt(fd?.totalRevenue, "$")} | Revenue growth: ${fd?.revenueGrowth != null ? pct(fd.revenueGrowth) : "N/A"}`);
  lines.push(`Gross profit: ${fmt(fd?.grossProfits, "$")} | Gross margin: ${fd?.grossMargins != null ? pct(fd.grossMargins) : "N/A"}`);
  lines.push(`Operating margin: ${fd?.operatingMargins != null ? pct(fd.operatingMargins) : "N/A"} | Profit margin: ${fd?.profitMargins != null ? pct(fd.profitMargins) : "N/A"}`);
  lines.push(`EBITDA: ${fmt(fd?.ebitda, "$")} | Net income: ${inc?.netIncome != null ? fmt(inc.netIncome, "$") : "N/A"}`);
  lines.push(`Free cash flow: ${fmt(fd?.freeCashflow, "$")} | Operating cash flow: ${fmt(fd?.operatingCashflow, "$")}`);
  lines.push(`Total cash: ${fmt(fd?.totalCash, "$")} | Total debt: ${fmt(fd?.totalDebt, "$")} | D/E ratio: ${fd?.debtToEquity?.toFixed(2) ?? "N/A"}`);
  lines.push(`Return on equity: ${fd?.returnOnEquity != null ? pct(fd.returnOnEquity) : "N/A"} | Return on assets: ${fd?.returnOnAssets != null ? pct(fd.returnOnAssets) : "N/A"}`);
  if (earn?.earningsChart?.quarterly?.length) {
    const q = earn.earningsChart.quarterly.slice(-4);
    lines.push(`EPS (last 4 qtrs): ${q.map((e) => `${e.date} A:${e.actual?.fmt ?? "?"} E:${e.estimate?.fmt ?? "?"}`).join(" | ")}`);
  }

  // Price analysis
  if (periodAnalysis) {
    lines.push(`\n--- Price Analysis (selected period) ---`);
    lines.push(`Biggest same-day swing: ${periodAnalysis.biggestSameDayDiff?.difference ?? "N/A"} on ${periodAnalysis.biggestSameDayDiff?.date ?? "N/A"}`);
    if (periodAnalysis.biggestNextDayDiff) {
      const [d1, d2, diff] = periodAnalysis.biggestNextDayDiff;
      lines.push(`Biggest next-day swing: ${diff} from ${d1.date} to ${d2.date}`);
    }
  }

  // News + sentiment
  if (newsArticles?.length) {
    lines.push(`\n--- News (${newsArticles.length} articles) ---`);
    const withSentiment = newsArticles
      .filter((a) => newsAnalysisData?.[a.link]?.sentiment != null)
      .sort((a, b) => (newsAnalysisData[b.link].sentiment) - (newsAnalysisData[a.link].sentiment));
    const top = withSentiment.slice(0, 3);
    const bottom = withSentiment.slice(-3).reverse();
    if (top.length) lines.push(`Most positive: ${top.map((a) => `"${a.title}" (${newsAnalysisData[a.link].sentiment.toFixed(2)})`).join(" | ")}`);
    if (bottom.length) lines.push(`Most negative: ${bottom.map((a) => `"${a.title}" (${newsAnalysisData[a.link].sentiment.toFixed(2)})`).join(" | ")}`);
    lines.push(`Recent: ${newsArticles.slice(0, 5).map((a) => a.title).join(" | ")}`);
  }

  // Intelligence articles
  if (intelligenceArticles?.length) {
    lines.push(`\n--- Intelligence Articles (${intelligenceArticles.length}) ---`);
    lines.push(intelligenceArticles.slice(0, 5).map((a) => `${a.timestamp?.slice(0, 10) ?? "?"}: ${a.id}`).join("\n"));
  }

  // Trump posts
  if (trump?.posts?.length) {
    lines.push(`\n--- Trump Posts (${trump.posts.length} relevant) ---`);
    trump.posts.slice(0, 5).forEach((p) => {
      lines.push(`${p.created_at?.slice(0, 10) ?? "?"} [${p.analysis?.sentiment ?? "?"}]: ${p.content?.slice(0, 120)}`);
    });
    const corrStr = corrLine("Trump sentiment correlation", trump.correlation, trump.lagImpact);
    if (corrStr) lines.push(corrStr);
  }

  // Threat intel
  const nvdItems = nvdData?.items ?? [];
  const otxItems = otxData?.items ?? [];
  const kevItems = kevData?.items ?? [];
  if (nvdItems.length) {
    lines.push(`\n--- NVD CVEs (${nvdItems.length}) ---`);
    nvdItems.slice(0, 5).forEach((v) => lines.push(`${v.published?.slice(0, 10) ?? "?"} [${v.severity ?? "?"}] ${v.cveId ?? v.cveID}: ${v.description?.slice(0, 100)}`));
    const c = corrLine("NVD correlation", threatIntel?.nvd?.data?.correlation, threatIntel?.nvd?.data?.lagImpact);
    if (c) lines.push(c);
  }
  if (kevItems.length) {
    lines.push(`\n--- CISA KEV (${kevItems.length}) ---`);
    kevItems.slice(0, 5).forEach((v) => lines.push(`${v.dateAdded ?? "?"} ${v.cveID}: ${v.vulnerabilityName}`));
    const c = corrLine("KEV correlation", threatIntel?.kev?.data?.correlation, threatIntel?.kev?.data?.lagImpact);
    if (c) lines.push(c);
  }
  if (otxItems.length) {
    lines.push(`\n--- OTX Pulses (${otxItems.length}) ---`);
    otxItems.slice(0, 5).forEach((p) => lines.push(`${p.created?.slice(0, 10) ?? "?"}: ${p.name}`));
    const c = corrLine("OTX correlation", threatIntel?.otx?.data?.correlation, threatIntel?.otx?.data?.lagImpact);
    if (c) lines.push(c);
  }

  // Stock correlation
  if (compareTicker && correlationData) {
    lines.push(`\n--- Stock Correlation vs ${compareTicker} ---`);
    const c = corrLine(`${ticker} vs ${compareTicker}`, correlationData, null);
    if (c) lines.push(c);
  }

  // Simulation
  if (simulationResult) {
    lines.push(`\n--- Simulation Results ---`);
    lines.push(`Total invested: $${Number(simulationResult.totalInvested).toFixed(2)}`);
    lines.push(`Shares held: ${Number(simulationResult.finalShares).toFixed(4)} | Current value: $${Number(simulationResult.sharesValue).toFixed(2)}`);
    lines.push(`Cash withdrawn: $${Number(simulationResult.cashWithdrawn).toFixed(2)}`);
    lines.push(`Transactions: ${simulationResult.transactions.map((t) => `${t.date} ${t.type} ${Number(t.shares).toFixed(4)}sh @ $${Number(t.price).toFixed(2)}`).join(", ")}`);
  }

  // Market research
  if (researchSections?.length) {
    lines.push(`\n--- Market Research ---`);
    researchSections.forEach((s) => lines.push(`${s.title}:\n${s.text}`));
  }

  return lines.join("\n");
}
