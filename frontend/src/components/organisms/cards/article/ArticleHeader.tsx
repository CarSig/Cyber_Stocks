import { Badge } from '@/components/ui/badge';
import type { NewsArticle } from '@/types';

type ArticleHeaderProps = { article: NewsArticle };

export default function ArticleHeader({ article }: ArticleHeaderProps) {
  return (
    <div className="article-card-header">
      <span className="article-card-title">{article.title}</span>
      <Badge variant="secondary" className="article-card-badge">
        {article.source}
      </Badge>
    </div>
  );
}
