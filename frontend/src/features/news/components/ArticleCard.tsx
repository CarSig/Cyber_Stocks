import { useState } from 'react';
import TagBadge from '@/components/common/data-display/TagBadge';
import CountBadge from '@/components/common/data-display/CountBadge';
import BaseCard from '@/components/common/cards/BaseCard';
import SentimentBar from '@/components/common/data-display/SentimentBar';
import ArticleMeta from './ArticleMeta';
import ArticleHeader from './ArticleHeader';
import type { NewsArticle, SentimentAnalysis } from '@/types';

type ArticleAnalysisProps = { analysis: SentimentAnalysis };

function ArticleAnalysis({ analysis }: ArticleAnalysisProps) {
  return (
    <>
      <div className="article-card-sentiment">
        <SentimentBar value={analysis.sentiment} />
      </div>
      <div className="article-card-tags">
        <TagBadge>imp {analysis.importance}/10</TagBadge>
        <TagBadge>rel {analysis.relevance}/10</TagBadge>
        {analysis.catalyst && <TagBadge color="#fb923c">catalyst</TagBadge>}
        {analysis.timeframe && <TagBadge>{analysis.timeframe}</TagBadge>}
      </div>
      {(analysis.topics?.length ?? 0) > 0 && (
        <div className="article-card-topics">
          {analysis.topics!.map((t) => (
            <CountBadge key={t} count={t} />
          ))}
        </div>
      )}
      {analysis.summary && (
        <p className={`article-card-summary ${!analysis.entities?.length ? 'no-margin' : ''}`}>{analysis.summary}</p>
      )}
    </>
  );
}

type OtherMatchesSectionProps = {
  allMatches?: Array<{ ticker: string; company: string }>;
  matchedTicker?: string;
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

function OtherMatchesSection({ allMatches, matchedTicker, open, setOpen }: OtherMatchesSectionProps) {
  return (
    <>
      {(allMatches?.length ?? 0) > 1 && (
        <button onClick={() => setOpen((o) => !o)} className="article-card-button">
          {open ? 'Hide' : `Also mentions ${allMatches!.length - 1} other company`}
          {allMatches!.length - 1 > 1 ? 'ies' : ''} ↓
        </button>
      )}
      {open && (
        <div className="article-card-other-matches">
          {allMatches!
            .filter((m) => m.ticker !== matchedTicker)
            .map((m) => (
              <TagBadge key={m.ticker}>
                {m.company} ({m.ticker})
              </TagBadge>
            ))}
        </div>
      )}
    </>
  );
}

type ArticleCardProps = { article: NewsArticle };

export default function ArticleCard({ article }: ArticleCardProps) {
  const [open, setOpen] = useState(false);
  const analysis = article.analysis;

  return (
    <BaseCard variant="article">
      <ArticleHeader article={article} />
      <ArticleMeta article={article} />
      {analysis && <ArticleAnalysis analysis={analysis} />}
      <OtherMatchesSection
        allMatches={article.allMatches}
        matchedTicker={article.matchedTicker}
        open={open}
        setOpen={setOpen}
      />
    </BaseCard>
  );
}
