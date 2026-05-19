import { Badge } from '@/components/ui/badge';
import TagBadge from '@/components/common/TagBadge';
import { sentimentColor } from '@/utils/sentimentUtils';
import { classifyUrgency } from '@/utils/urgencyUtils';
import { formatArticleTitle } from '@/utils/articleUtils';
import SentimentBar from '@/components/common/SentimentBar';
import UrgencyBadge from '@/components/common/UrgencyBadge';
import type { UrgencyKey } from '@/types';

type ArticleEntity = {
  entityId: string;
  name: string;
  role: string;
  score: number;
  sentiment: number;
};

type IntelArticle = {
  title?: string;
  id?: string;
  entities: ArticleEntity[];
  timestamp?: string | number;
  globalSignals?: string[];
  companySignals?: string[];
  publisher?: string;
  link?: string;
  newsType: string;
};

type ArticleDetailProps = {
  article: IntelArticle;
  focusEntityId?: string;
};

export default function ArticleDetail({ article, focusEntityId }: ArticleDetailProps) {
  const mention = article.entities.find((e) => e.entityId === focusEntityId);
  const title = formatArticleTitle(article);
  let urgency: UrgencyKey = 'future_short';
  try {
    if (article.timestamp != null) {
      urgency = classifyUrgency(article.timestamp, article.globalSignals ?? [], article.companySignals ?? []);
    }
  } catch (e) {
    console.error('Error classifying urgency:', e);
  }

  return (
    <div className="article-detail">
      <div className="article-detail-header">
        <span className="article-detail-title">{title}</span>
        <div className="article-detail-badges">
          <UrgencyBadge urgency={urgency} />
          <Badge variant="secondary">{article.newsType.replace(/_/g, ' ')}</Badge>
        </div>
      </div>

      {article.publisher && (
        <p className="article-detail-publisher">
          {article.publisher}
          {article.link && (
            <>
              {' '}
              ·{' '}
              <a href={article.link} target="_blank" rel="noopener noreferrer">
                source ↗
              </a>
            </>
          )}
        </p>
      )}

      {mention && (
        <div className="article-detail-sentiment">
          <p className="article-detail-sentiment-label">
            Sentiment for <strong className="entity-name-capitalize">{focusEntityId}</strong>
            {' · '}
            <span>{mention.role.replace(/_/g, ' ')}</span>
            {' · '}relevance {mention.score.toFixed(2)}
          </p>
          <SentimentBar value={mention.sentiment} />
        </div>
      )}

      {article.entities.length > 1 && (
        <div className="article-detail-entities">
          <p className="article-detail-entities-label">All entities</p>
          <div className="article-detail-entities-list">
            {article.entities.map((e) => (
              <span
                key={e.entityId}
                className="article-detail-entity-tag"
                style={{
                  color: sentimentColor(e.sentiment),
                  border: e.entityId === focusEntityId ? '1px solid currentColor' : '1px solid transparent',
                }}
              >
                {e.name} {e.sentiment > 0 ? '+' : ''}
                {e.sentiment.toFixed(2)}
              </span>
            ))}
          </div>
        </div>
      )}

      {((article.companySignals?.length ?? 0) > 0 || (article.globalSignals?.length ?? 0) > 0) && (
        <div className="article-detail-signals">
          {[...new Set(article.companySignals)].map((s) => (
            <TagBadge key={`c-${s}`} color="#fb923c">
              {s}
            </TagBadge>
          ))}
          {[...new Set(article.globalSignals)].map((s) => (
            <TagBadge key={`g-${s}`} color="#60a5fa">
              {s}
            </TagBadge>
          ))}
        </div>
      )}
    </div>
  );
}
