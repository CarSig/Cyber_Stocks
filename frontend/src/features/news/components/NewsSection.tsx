import { useState } from 'react';
import { useNewsAnalysis } from '../hooks';
import CorrelationBox from '@/features/correlations/components/CorrelationBox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TagBadge from '@/components/common/TagBadge';
import CountBadge from '@/components/common/CountBadge';
import type { NewsArticle, NewsAnalysisMap } from '@/types';

const PAGE_SIZE = 10;

function sentimentVariant(s: number): 'default' | 'destructive' | 'secondary' {
  return s >= 0.1 ? 'default' : s <= -0.1 ? 'destructive' : 'secondary';
}

function sentimentArrow(s: number): string {
  return s >= 0.6 ? '▲▲' : s >= 0.1 ? '▲' : s <= -0.6 ? '▼▼' : s <= -0.1 ? '▼' : '●';
}

type NewsSectionProps = {
  ticker: string;
  news?: NewsArticle[];
};

export default function NewsSection({ ticker, news }: NewsSectionProps) {
  const {
    analysis,
    correlation,
    analyze,
    showCorrelation,
    setShowCorrelation,
    polling,
    lagDays,
    setLagDays,
    currentTitle,
    analyzedCount,
    totalCount: progressTotal,
  } = useNewsAnalysis(ticker);
  const [page, setPage] = useState(0);

  const totalCount = news?.length ?? 0;
  const displayAnalyzed = analyzedCount;
  const displayTotal = progressTotal ?? totalCount;
  const sortedNews = (news ?? []).slice().sort((a, b) => {
    const ta =
      typeof a.providerPublishTime === 'number' || /^\d{10}$/.test(String(a.providerPublishTime))
        ? Number(a.providerPublishTime) * 1000
        : new Date(a.providerPublishTime ?? '').getTime();
    const tb =
      typeof b.providerPublishTime === 'number' || /^\d{10}$/.test(String(b.providerPublishTime))
        ? Number(b.providerPublishTime) * 1000
        : new Date(b.providerPublishTime ?? '').getTime();
    return tb - ta;
  });
  const pageCount = Math.ceil(totalCount / PAGE_SIZE);
  const visibleNews = sortedNews.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const analysisData = analysis.data as NewsAnalysisMap | null | undefined;

  return (
    <section>
      <h2>News ({totalCount} articles)</h2>

      <div className="news-toolbar">
        <Button onClick={() => analyze.mutate()} disabled={analyze.isPending || polling}>
          {analyze.isPending ? 'Queuing…' : polling ? 'Processing…' : 'Analyze Sentiment'}
        </Button>
        <span className="news-analyzed-count">
          {displayAnalyzed} / {displayTotal} analyzed
        </span>
        {polling && (
          <span className="news-current-title" title={currentTitle ?? ''}>
            ↻ {currentTitle ?? 'waiting…'}
          </span>
        )}
        <Button
          variant="ghost"
          onClick={() => setShowCorrelation((v) => !v)}
          data-active={showCorrelation || undefined}
        >
          Correlation
        </Button>
        {analyze.data && !polling && (
          <span className="news-analyze-result">
            {(analyze.data as { queued: number }).queued > 0
              ? `Queued ${(analyze.data as { queued: number }).queued} articles`
              : 'All articles already analyzed'}
          </span>
        )}
      </div>

      {showCorrelation && (
        <div className="correlation-box">
          <CorrelationBox
            correlation={correlation.data?.correlation}
            lagImpact={correlation.data?.lagImpact}
            lagDays={lagDays}
            onLagDaysChange={setLagDays}
            isPending={correlation.isPending}
            isFetching={correlation.isFetching}
            error={correlation.error ?? undefined}
          />
        </div>
      )}

      <ul className="news-list">
        {visibleNews.map((article) => {
          const scores = article.link ? analysisData?.[article.link] : undefined;
          return (
            <li key={article.link} className="news-item">
              <div className="news-item-main">
                <a href={article.link} target="_blank" rel="noreferrer">
                  {article.title}
                </a>
                <span className="news-meta">
                  {' '}
                  — {article.publisher} · {new Date(article.providerPublishTime ?? '').toLocaleDateString()}
                </span>
              </div>
              {scores && (
                <div className="news-analysis">
                  <div className="news-badges">
                    <Badge variant={sentimentVariant(scores.sentiment)}>
                      {sentimentArrow(scores.sentiment)} {scores.sentiment.toFixed(2)}
                    </Badge>
                    <TagBadge>imp {scores.importance}/10</TagBadge>
                    <TagBadge>rel {scores.relevance}/10</TagBadge>
                    {scores.timeframe && <TagBadge>{scores.timeframe}-term</TagBadge>}
                    {scores.catalyst && <TagBadge>catalyst</TagBadge>}
                  </div>
                  {scores.summary && <p className="news-summary">{scores.summary}</p>}
                  {(scores.topics?.length ?? 0) > 0 && (
                    <div className="news-topics">
                      {scores.topics?.map((t) => (
                        <CountBadge key={t} count={t} />
                      ))}
                      {scores.entities?.map((e) => (
                        <TagBadge key={typeof e === 'string' ? e : e.name} className="news-entity">
                          {typeof e === 'string' ? e : e.name}
                        </TagBadge>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {pageCount > 1 && (
        <div className="news-pagination">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(0)}>
            «
          </Button>
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            ‹
          </Button>
          <span className="news-pagination-label">
            {page + 1} / {pageCount}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage((p) => p + 1)}>
            ›
          </Button>
          <Button variant="outline" size="sm" disabled={page >= pageCount - 1} onClick={() => setPage(pageCount - 1)}>
            »
          </Button>
        </div>
      )}
    </section>
  );
}
