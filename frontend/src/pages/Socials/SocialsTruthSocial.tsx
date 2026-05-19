import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createChart, HistogramSeries } from 'lightweight-charts';
import { getPosts } from '@/features/social/api';
import { getCompanies } from '@/features/tickers/api';
import Page from '@/components/common/Page';
import FilterSelect from '@/components/common/FilterSelect';
import type { TrumpPost } from '@/types';

type TrumpPostWithExtras = TrumpPost & {
  id?: string;
  url?: string;
  text?: string;
};

type TrumpPostsChartProps = {
  posts: TrumpPostWithExtras[];
};

function TrumpPostsChart({ posts }: TrumpPostsChartProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!posts?.length || !ref.current) return;

    const counts: Record<string, number> = {};
    for (const p of posts) {
      const day = p.created_at.slice(0, 10);
      counts[day] = (counts[day] ?? 0) + 1;
    }
    const data = Object.entries(counts)
      .map(([time, value]) => ({ time, value }))
      .sort((a, b) => (a.time < b.time ? -1 : 1));

    const cv = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
      height: 260,
      layout: { background: { color: cv('--surface-0') }, textColor: cv('--text-primary') },
      grid: { vertLines: { color: cv('--surface-3') }, horzLines: { color: cv('--surface-3') } },
      timeScale: { timeVisible: false },
      rightPriceScale: { borderVisible: false },
    });
    const s = chart.addSeries(HistogramSeries, { color: cv('--color-amber'), priceLineVisible: false });
    s.setData(data as Parameters<typeof s.setData>[0]);
    chart.timeScale().fitContent();

    let disposed = false;
    const obs = new ResizeObserver(() => {
      if (!disposed && ref.current) chart.applyOptions({ width: ref.current.clientWidth });
    });
    obs.observe(ref.current);
    return () => {
      disposed = true;
      obs.disconnect();
      chart.remove();
    };
  }, [posts]);

  return <div ref={ref} className="chart-container" />;
}

function filterByCompany(
  posts: TrumpPostWithExtras[],
  ticker: string,
  companies: Record<string, string> | undefined,
): TrumpPostWithExtras[] {
  if (!ticker || !companies) return posts;
  const name = Object.entries(companies).find(([, t]) => t === ticker)?.[0] ?? '';
  const nameLower = name.toLowerCase();
  const tickerLower = ticker.toLowerCase();
  return posts.filter((p) => {
    const text = (p.content || p.text || '').toLowerCase();
    return text.includes(nameLower) || text.includes(tickerLower);
  });
}

export default function SocialsTruthSocial() {
  const [company, setCompany] = useState('');
  const [NOW] = useState(() => Date.now());

  const {
    data: posts,
    isPending,
    error,
  } = useQuery<TrumpPostWithExtras[]>({
    queryKey: ['trump-posts'],
    queryFn: getPosts,
  });
  const { data: companies } = useQuery<Record<string, string>>({
    queryKey: ['companies'],
    queryFn: getCompanies,
  });

  const filtered = posts ? filterByCompany(posts, company, companies).filter((p) => p.content || p.text) : [];
  const last30 = filtered.filter((p) => NOW - new Date(p.created_at).getTime() < 30 * 86400_000).length;

  return (
    <Page>
      <div className="ti-detail-header">
        <Link to="/socials" className="ti-back">
          ← Socials
        </Link>
        <h1>Truth Social</h1>
      </div>

      <section>
        <h2>Trump Posts per Day</h2>
        {isPending && <p>Loading…</p>}
        {error && <p className="ti-error">{(error as Error).message}</p>}
        {posts && (
          <>
            <div className="ti-filters ti-filters-mb-16">
              <FilterSelect
                value={company}
                onChange={(v) => setCompany(v ?? '')}
                placeholder="Companies"
                options={Object.entries(companies ?? {}).map(([name, ticker]) => ({
                  label: `${name} (${ticker})`,
                  value: ticker,
                }))}
              />
              <span className="ti-count">{filtered.length} posts</span>
              <span className="ti-count">{last30} in last 30d</span>
            </div>
            <TrumpPostsChart posts={filtered} />

            <div className="socials-posts">
              {[...filtered]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 10)
                .map((p) => (
                  <a key={p.id} href={p.url} target="_blank" rel="noreferrer" className="socials-post">
                    <span className="socials-post-date">{new Date(p.created_at).toLocaleDateString()}</span>
                    <span className="socials-post-text">{p.content || p.text}</span>
                  </a>
                ))}
            </div>
          </>
        )}
      </section>
    </Page>
  );
}
