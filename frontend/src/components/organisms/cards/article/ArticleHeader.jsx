import { Badge } from '@/components/ui/badge.jsx';

export default function ArticleHeader({ article }) {
  return (
    <div className="article-card-header">
      <span className="article-card-title">{article.title}</span>
      <Badge variant="secondary" className="article-card-badge">
        {article.source}
      </Badge>
    </div>
  );
}
