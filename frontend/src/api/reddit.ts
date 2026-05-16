import { apiFetch } from './core';
import type { RedditPost, RedditComment } from '@/types';

export function getPosts(subreddit: string): Promise<RedditPost[]> {
  return apiFetch<RedditPost[]>(`/reddit/posts?subreddit=${encodeURIComponent(subreddit)}`);
}

export function getComments(subreddit: string, id: string): Promise<RedditComment[]> {
  return apiFetch<RedditComment[]>(`/reddit/comments/${encodeURIComponent(subreddit)}/${encodeURIComponent(id)}`);
}
