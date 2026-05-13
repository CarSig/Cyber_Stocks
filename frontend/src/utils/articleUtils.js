export function formatArticleTitle(article) {
  return article.title ?? article.id.replace(/^[a-z]+-\d{4}-\d{2}-\d{2}-/, "").replace(/-/g, " ");
}
