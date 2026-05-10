import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { createChart, HistogramSeries } from "lightweight-charts";
import { getTrumpPosts, getCompanies } from "../api.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function TrumpPostsChart({ posts }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!posts?.length || !ref.current) return;

    const counts = {};
    for (const p of posts) {
      const day = p.created_at.slice(0, 10);
      counts[day] = (counts[day] ?? 0) + 1;
    }
    const data = Object.entries(counts)
      .map(([time, value]) => ({ time, value }))
      .sort((a, b) => (a.time < b.time ? -1 : 1));

    const cv = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
      height: 260,
      layout: { background: { color: cv("--surface-0") }, textColor: cv("--text-primary") },
      grid: { vertLines: { color: cv("--surface-3") }, horzLines: { color: cv("--surface-3") } },
      timeScale: { timeVisible: false },
      rightPriceScale: { borderVisible: false },
    });
    const s = chart.addSeries(HistogramSeries, { color: cv("--color-amber"), priceLineVisible: false });
    s.setData(data);
    chart.timeScale().fitContent();

    const obs = new ResizeObserver(() => { if (ref.current) chart.applyOptions({ width: ref.current.clientWidth }); });
    obs.observe(ref.current);
    return () => { obs.disconnect(); chart.remove(); };
  }, [posts]);

  return <div ref={ref} className="chart-container" />;
}

function filterByCompany(posts, ticker, companies) {
  if (!ticker || !companies) return posts;
  const name = Object.entries(companies).find(([, t]) => t === ticker)?.[0] ?? "";
  const nameLower = name.toLowerCase();
  const tickerLower = ticker.toLowerCase();
  return posts.filter((p) => {
    const text = (p.content || p.text || "").toLowerCase();
    return text.includes(nameLower) || text.includes(tickerLower);
  });
}

export default function Socials() {
  const [company, setCompany] = useState("");

  const { data: posts, isPending, error } = useQuery({
    queryKey: ["trump-posts"],
    queryFn: getTrumpPosts,
  });
  const { data: companies } = useQuery({ queryKey: ["companies"], queryFn: getCompanies });

  const filtered = posts ? filterByCompany(posts, company, companies).filter((p) => p.content || p.text) : [];
  const last30 = filtered.filter((p) => Date.now() - new Date(p.created_at).getTime() < 30 * 86400_000).length;

  return (
    <div className="ti-detail-page">
      <div className="ti-detail-header">
        <Link to="/socials" className="ti-back">← Socials</Link>
        <h1>Truth Social</h1>
      </div>

      <section>
        <h2>Trump Posts per Day</h2>
        {isPending && <p>Loading…</p>}
        {error && <p className="ti-error">{error.message}</p>}
        {posts && (
          <>
            <div className="ti-filters" style={{ marginBottom: 16 }}>
              <Select value={company} onValueChange={setCompany}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="All companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All companies</SelectItem>
                  {Object.entries(companies ?? {}).map(([name, ticker]) => (
                    <SelectItem key={ticker} value={ticker}>{name} ({ticker})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="ti-count">{filtered.length} posts</span>
              <span className="ti-count">{last30} in last 30d</span>
            </div>
            <TrumpPostsChart posts={filtered} />

            <div className="socials-posts">
              {[...filtered]
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 10)
                .map((p) => (
                  <a
                    key={p.id}
                    href={p.url}
                    target="_blank"
                    rel="noreferrer"
                    className="socials-post"
                  >
                    <span className="socials-post-date">
                      {new Date(p.created_at).toLocaleDateString()}
                    </span>
                    <span className="socials-post-text">{p.content || p.text}</span>
                  </a>
                ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
