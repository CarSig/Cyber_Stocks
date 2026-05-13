export default function ArticleMeta({ article }) {
  return (
    <p className="article-card-meta">
      {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : ""}
      {article.author ? ` · ${article.author}` : ""}
      {article.link && (
        <>
          {" "}
          ·{" "}
          <a href={article.link} target="_blank" rel="noopener noreferrer" className="article-card-link">
            source ↗
          </a>
        </>
      )}
    </p>
  );
}
