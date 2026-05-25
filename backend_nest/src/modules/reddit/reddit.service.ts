import fs from "fs";
import path from "path";
import { PATHS } from "@/shared/paths";

export type RedditComment = {
  id: string;
  author: string;
  body: string;
  score: number;
  createdAt: string;
  replies: RedditComment[];
};

export type RedditPost = {
  id: string;
  subreddit: string;
  title: string;
  text: string;
  url: string;
  author: string;
  score: number;
  numComments: number;
  createdAt: string;
};

type RedditApiChild = {
  data: {
    id: string;
    subreddit: string;
    title: string;
    selftext: string;
    url: string;
    author: string;
    score: number;
    num_comments: number;
    created_utc: number;
    permalink: string;
  };
};

type RawComment = {
  kind: string;
  data: {
    id: string;
    author: string;
    body: string;
    score: number;
    created_utc: number;
    replies: "" | { data: { children: RawComment[] } };
  };
};

function parseComments(children: RawComment[]): RedditComment[] {
  return children
    .filter((c) => c.kind === "t1")
    .map((c) => ({
      id: c.data.id,
      author: c.data.author,
      body: c.data.body,
      score: c.data.score,
      createdAt: new Date(c.data.created_utc * 1000).toISOString(),
      replies: c.data.replies
        ? parseComments((c.data.replies as { data: { children: RawComment[] } }).data.children)
        : [],
    }));
}

export const SUBREDDITS = ["ExperiencedDevs", "cybersecurity"] as const;
export type Subreddit = typeof SUBREDDITS[number];

const TTL_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

type RedditFile = { fetchedAt: string; posts: RedditPost[] };

export class RedditService {
  async getPosts(subreddit: Subreddit): Promise<RedditPost[]> {
    const p = PATHS.redditPosts(subreddit);
    if (fs.existsSync(p)) {
      const file = JSON.parse(fs.readFileSync(p, "utf-8")) as RedditFile | RedditPost[];
      if (!Array.isArray(file) && Date.now() - new Date(file.fetchedAt).getTime() <= TTL_MS) {
        return file.posts;
      }
    }
    await this.sync(subreddit);
    const file = JSON.parse(fs.readFileSync(p, "utf-8")) as RedditFile;
    return file.posts;
  }

  async sync(subreddit: Subreddit): Promise<void> {
    const res = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=100`,
      { headers: { "User-Agent": "algo-trading-app/1.0" } },
    );
    if (!res.ok) throw new Error(`Reddit fetch failed: ${res.status}`);
    const body = await res.json() as { data: { children: RedditApiChild[] } };
    const posts: RedditPost[] = body.data.children.map((c) => ({
      id: c.data.id,
      subreddit: c.data.subreddit,
      title: c.data.title,
      text: c.data.selftext,
      url: `https://www.reddit.com${c.data.permalink}`,
      author: c.data.author,
      score: c.data.score,
      numComments: c.data.num_comments,
      createdAt: new Date(c.data.created_utc * 1000).toISOString(),
    }));

    const file: RedditFile = { fetchedAt: new Date().toISOString(), posts };
    const p = PATHS.redditPosts(subreddit);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, JSON.stringify(file, null, 2));
  }

  async syncAll(): Promise<void> {
    await Promise.all(SUBREDDITS.map((s) => this.sync(s)));
  }

  async getComments(subreddit: string, postId: string): Promise<RedditComment[]> {
    const res = await fetch(
      `https://www.reddit.com/r/${subreddit}/comments/${postId}.json?limit=100&depth=10`,
      { headers: { "User-Agent": "algo-trading-app/1.0" } },
    );
    if (!res.ok) throw new Error(`Reddit comments fetch failed: ${res.status}`);
    const body = await res.json() as [unknown, { data: { children: RawComment[] } }];
    return parseComments(body[1].data.children);
  }
}
