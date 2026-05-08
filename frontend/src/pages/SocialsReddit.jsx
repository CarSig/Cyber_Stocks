import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getRedditPosts, getRedditComments } from "../api.js";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const SUBREDDITS = [
  { value: "ExperiencedDevs", label: "r/ExperiencedDevs" },
  { value: "cybersecurity",   label: "r/cybersecurity" },
];

const SEARCH_FIELDS = [
  { value: "all",   label: "All" },
  { value: "title", label: "Title" },
  { value: "text",  label: "Text" },
];

function filterPosts(posts, query, field) {
  if (!query.trim()) return posts;
  const q = query.toLowerCase();
  return posts.filter((p) => {
    if (field === "title") return p.title.toLowerCase().includes(q);
    if (field === "text")  return p.text.toLowerCase().includes(q);
    return p.title.toLowerCase().includes(q) || p.text.toLowerCase().includes(q);
  });
}

function CommentNode({ comment, depth = 0 }) {
  const [collapsed, setCollapsed] = useState(false);
  const hasReplies = comment.replies?.length > 0;

  return (
    <div>
      {/* Header row: always visible */}
      <div className="flex items-center gap-2 flex-wrap">
        {hasReplies && (
          <button
            onClick={() => setCollapsed((v) => !v)}
            style={{ fontSize: "9px", color: "var(--muted-foreground)", cursor: "pointer", background: "none", border: "none", padding: "0 2px", lineHeight: 1 }}
          >
            {collapsed ? "▶" : "▼"}
          </button>
        )}
        <span className="text-xs font-medium text-(--color-blue)">u/{comment.author}</span>
        <Badge variant="secondary" className="text-[10px] px-1 py-0">▲ {comment.score}</Badge>
        <span className="text-[10px] text-muted-foreground">{new Date(comment.createdAt).toLocaleDateString()}</span>
      </div>

      {/* Body: always visible */}
      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap mt-1 mb-1">{comment.body}</p>

      {/* Replies: collapsible, only shown when hasReplies */}
      {hasReplies && !collapsed && (
        <div style={{ marginLeft: "20px", paddingLeft: "12px", borderLeft: "2px solid var(--border)", marginTop: "6px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {comment.replies.map((r) => (
            <CommentNode key={r.id} comment={r} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

function Comments({ subreddit, postId }) {
  const { data, isPending, error } = useQuery({
    queryKey: ["reddit-comments", subreddit, postId],
    queryFn: () => getRedditComments(subreddit, postId),
    staleTime: 5 * 60 * 1000,
  });

  if (isPending) return <p className="text-sm text-muted-foreground py-2">Loading comments…</p>;
  if (error)     return <p className="text-sm text-destructive py-2">{error.message}</p>;
  if (!data?.length) return <p className="text-sm text-muted-foreground py-2">No comments</p>;

  return (
    <div className="flex flex-col gap-3 mt-3">
      {data.map((c) => <CommentNode key={c.id} comment={c} />)}
    </div>
  );
}

function RedditPost({ post, subreddit }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">{new Date(post.createdAt).toLocaleDateString()}</span>
          <Badge variant="secondary" className="text-[10px] px-1.5">▲ {post.score}</Badge>
          <Badge variant="outline" className="text-[10px] px-1.5">💬 {post.numComments}</Badge>
          <span className="text-xs text-muted-foreground">u/{post.author}</span>
          <a
            href={post.url}
            target="_blank"
            rel="noreferrer"
            className="ml-auto text-xs text-(--color-blue) hover:underline"
          >
            open ↗
          </a>
        </div>
        <p className="text-sm font-medium text-foreground leading-snug mt-1">{post.title}</p>
      </CardHeader>

      {post.text && (
        <CardContent className="px-4 pb-2 pt-0">
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{post.text}</p>
        </CardContent>
      )}

      <CardContent className="px-4 pb-3 pt-0">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "▲ hide comments" : `▼ show comments (${post.numComments})`}
        </Button>

        {expanded && (
          <>
            <Separator className="my-2" />
            <Comments subreddit={subreddit} postId={post.id} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function SocialsReddit() {
  const [subreddit, setSubreddit]     = useState("ExperiencedDevs");
  const [search, setSearch]           = useState("");
  const [searchField, setSearchField] = useState("all");

  const { data: posts, isPending, error } = useQuery({
    queryKey: ["reddit-posts", subreddit],
    queryFn: () => getRedditPosts(subreddit),
  });

  const filtered = useMemo(
    () => filterPosts(posts ?? [], search, searchField),
    [posts, search, searchField],
  );

  return (
    <div className="ti-detail-page">
      <div className="ti-detail-header">
        <Link to="/socials" className="ti-back">← Socials</Link>
        <h1>Reddit</h1>
      </div>

      <div className="ti-filters" style={{ marginBottom: "1rem" }}>
        <Select value={subreddit} onValueChange={setSubreddit}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SUBREDDITS.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          className="ti-search"
          placeholder="Search posts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <Select value={searchField} onValueChange={setSearchField}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SEARCH_FIELDS.map((f) => (
              <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {posts && (
          <span className="ti-count">
            {filtered.length}{search ? ` / ${posts.length}` : ""} posts
          </span>
        )}
      </div>

      {isPending && <p className="ti-loading">Loading…</p>}
      {error && <p className="ti-error">{error.message}</p>}
      {posts?.length === 0 && <p className="ti-empty">No posts yet — sync runs every hour</p>}
      {!isPending && !error && posts?.length > 0 && filtered.length === 0 && (
        <p className="ti-empty">No posts match "{search}"</p>
      )}
      {filtered.length > 0 && (
        <div className="flex flex-col gap-3">
          {filtered.map((post) => (
            <RedditPost key={post.id} post={post} subreddit={subreddit} />
          ))}
        </div>
      )}
    </div>
  );
}
