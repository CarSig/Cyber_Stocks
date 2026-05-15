type ArticleLike = { title?: string; id?: string };

export function formatArticleTitle(article: ArticleLike): string {
  return article.title ?? (article.id ?? '').replace(/^[a-z]+-\d{4}-\d{2}-\d{2}-/, '').replace(/-/g, ' ');
}
