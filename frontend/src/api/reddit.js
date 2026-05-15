import { apiFetch } from "./core.js";

export function getPosts(subreddit) {
  return apiFetch(`/reddit-posts?subreddit=${encodeURIComponent(subreddit)}`);
}

export function getComments(subreddit, id) {
  return apiFetch(`/reddit-comments/${encodeURIComponent(subreddit)}/${encodeURIComponent(id)}`);
}
