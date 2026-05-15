import { apiFetch } from './core.js';

export function getPosts(subreddit) {
  return apiFetch(`/reddit/reddit-posts?subreddit=${encodeURIComponent(subreddit)}`);
}

export function getComments(subreddit, id) {
  return apiFetch(`/reddit/reddit-comments/${encodeURIComponent(subreddit)}/${encodeURIComponent(id)}`);
}
