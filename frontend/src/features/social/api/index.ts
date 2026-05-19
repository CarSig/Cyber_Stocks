import { apiFetch } from '@/api/core';
import type { TrumpPost, CorrelationWithImpact, LagImpactResult } from '@algo/shared';
import type { RedditPost, RedditComment } from '@/types';

export function getPosts(): Promise<TrumpPost[]> {
  return apiFetch<TrumpPost[]>('/trump/posts');
}

export function getPostsForTicker(ticker: string): Promise<TrumpPost[]> {
  return apiFetch<TrumpPost[]>(`/trump/posts/${ticker}`);
}

export function getCorrelation(ticker: string, lagDays = 1): Promise<CorrelationWithImpact> {
  return apiFetch<CorrelationWithImpact>(`/trump/correlate/${ticker}?lagDays=${lagDays}`);
}

export function getLagImpact(ticker: string, lagDays = 7): Promise<LagImpactResult> {
  return apiFetch<LagImpactResult>(`/trump/lag-impact/${ticker}?lagDays=${lagDays}`);
}

export function getRedditPosts(subreddit: string): Promise<RedditPost[]> {
  return apiFetch<RedditPost[]>(`/reddit/posts?subreddit=${encodeURIComponent(subreddit)}`);
}

export function getRedditComments(subreddit: string, id: string): Promise<RedditComment[]> {
  return apiFetch<RedditComment[]>(`/reddit/comments/${encodeURIComponent(subreddit)}/${encodeURIComponent(id)}`);
}
