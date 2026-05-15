export const SUBREDDITS = ['ExperiencedDevs', 'cybersecurity'];

export const SEARCH_FIELDS = ['title', 'text'];

type PostLike = { title: string; text?: string };

export function filterPosts(posts: PostLike[], query: string, field: string): PostLike[] {
  if (!query.trim()) return posts;
  const q = query.toLowerCase();
  return posts.filter((p: PostLike) => {
    if (field === 'title') return p.title.toLowerCase().includes(q);
    if (field === 'text') return (p.text ?? '').toLowerCase().includes(q);
    return p.title.toLowerCase().includes(q) || (p.text ?? '').toLowerCase().includes(q);
  });
}
