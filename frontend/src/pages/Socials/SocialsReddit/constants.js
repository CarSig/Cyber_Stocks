export const SUBREDDITS = ['ExperiencedDevs', 'cybersecurity'];

export const SEARCH_FIELDS = ['title', 'text'];

export function filterPosts(posts, query, field) {
  if (!query.trim()) return posts;
  const q = query.toLowerCase();
  return posts.filter((p) => {
    if (field === 'title') return p.title.toLowerCase().includes(q);
    if (field === 'text') return p.text.toLowerCase().includes(q);
    return p.title.toLowerCase().includes(q) || p.text.toLowerCase().includes(q);
  });
}
