import { useState } from "react";
import { Badge } from "@/components/ui/badge.jsx";
import TagBadge from "@/components/atoms/TagBadge.jsx";
import CountBadge from "@/components/atoms/CountBadge.jsx";
import BaseCard from "@/components/atoms/BaseCard.jsx";
import SentimentBar from "@/components/molecules/shared/SentimentBar.jsx";
import ArticleMeta from "@/components/molecules/cyber-news/ArticleMeta.jsx";
import ArticleHeader from "@/components/molecules/cyber-news/ArticleHeader.jsx";
import "./ArticleCard.css";

function ArticleAnalysis({ analysis }) {
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

      {analysis?.topics?.length > 0 && (
        <div className="article-card-topics">
          {analysis.topics.map((t) => (
            <CountBadge key={t} count={t} />
          ))}
        </div>
      )}

      {analysis?.summary && <p className={`article-card-summary ${!analysis.entities?.length ? "no-margin" : ""}`}>{analysis.summary}</p>}
    </>
  );
}

function OtherMatchesSection({ allMatches, matchedTicker, open, setOpen }) {
  return (
    <>
      {allMatches?.length > 1 && (
        <button onClick={() => setOpen((o) => !o)} className="article-card-button">
          {open ? "Hide" : `Also mentions ${allMatches.length - 1} other company`}
          {allMatches.length - 1 > 1 ? "ies" : ""} ↓
        </button>
      )}
      {open && (
        <div className="article-card-other-matches">
          {allMatches
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

export default function ArticleCard({ article }) {
  const [open, setOpen] = useState(false);
  const analysis = article.analysis;

  return (
    <BaseCard variant="article">
      <ArticleHeader article={article} />
      <ArticleMeta article={article} />
      {analysis && <ArticleAnalysis analysis={analysis} />}
      <OtherMatchesSection allMatches={article.allMatches} matchedTicker={article.matchedTicker} open={open} setOpen={setOpen} />
    </BaseCard>
  );
}
