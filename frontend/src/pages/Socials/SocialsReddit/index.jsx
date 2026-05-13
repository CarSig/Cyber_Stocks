import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import StateHandler from "@/components/organisms/shared/StateHandler.jsx";
import Page from "@/components/atoms/Page.jsx";
import { getRedditPosts } from "@/api.js";
import { Input } from "@/components/ui/input";
import FilterSelect from "@/components/molecules/shared/FilterSelect.jsx";
import RedditPost from "@/components/organisms/socials/RedditPost.jsx";
import { SUBREDDITS, SEARCH_FIELDS, filterPosts } from "./constants.js";

export default function SocialsReddit() {
  const [subreddit, setSubreddit] = useState("ExperiencedDevs");
  const [search, setSearch] = useState("");
  const [searchField, setSearchField] = useState("");

  const {
    data: posts,
    isPending,
    error,
  } = useQuery({
    queryKey: ["reddit-posts", subreddit],
    queryFn: () => getRedditPosts(subreddit),
  });

  const filtered = useMemo(() => filterPosts(posts ?? [], search, searchField), [posts, search, searchField]);

  return (
    <Page>
      <div className="ti-detail-header">
        <Link to="/socials" className="ti-back">
          ← Socials
        </Link>
        <h1>Reddit</h1>
      </div>

      <div className="ti-filters" style={{ marginBottom: "1rem" }}>
        <FilterSelect value={subreddit} onChange={setSubreddit} placeholder="subreddit" options={SUBREDDITS} showAll={false} />

        <Input className="ti-search" placeholder="Search posts…" value={search} onChange={(e) => setSearch(e.target.value)} />

        <FilterSelect value={searchField} onChange={setSearchField} placeholder="field" options={SEARCH_FIELDS} allLabel="all" />

        {posts && (
          <span className="ti-count">
            {filtered.length}
            {search ? ` / ${posts.length}` : ""} posts
          </span>
        )}
      </div>

      <StateHandler isPending={isPending} error={error} empty={posts?.length === 0} emptyMessage="No posts yet — sync runs every hour">
        {filtered.length === 0 && search ? (
          <p className="ti-empty">No posts match "{search}"</p>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((post) => (
              <RedditPost key={post.id} post={post} subreddit={subreddit} />
            ))}
          </div>
        )}
      </StateHandler>
    </Page>
  );
}
