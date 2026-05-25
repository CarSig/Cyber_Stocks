import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import StateHandler from '@/components/common/feedback/StateHandler';
import Page from '@/components/common/layout/Page';
import { getRedditPosts } from '@/features/social/api';
import { Input } from '@/components/ui/input';
import FilterSelect from '@/components/common/filters/FilterSelect';
import RedditPost from '@/features/social/components/RedditPost';
import { SUBREDDITS, SEARCH_FIELDS, filterPosts } from './constants';
import type { RedditPost as RedditPostType } from '@/types';

type RedditPostWithExtras = RedditPostType & {
  createdAt?: string;
  numComments?: number;
  text?: string;
};

export default function SocialsReddit() {
  const [subreddit, setSubreddit] = useState('ExperiencedDevs');
  const [search, setSearch] = useState('');
  const [searchField, setSearchField] = useState('');

  const {
    data: posts,
    isPending,
    error,
  } = useQuery<RedditPostWithExtras[]>({
    queryKey: ['reddit-posts', subreddit],
    queryFn: () => getRedditPosts(subreddit),
  });

  const filtered = useMemo(
    () => filterPosts(posts ?? [], search, searchField) as RedditPostWithExtras[],
    [posts, search, searchField],
  );

  return (
    <Page>
      <div className="ti-detail-header">
        <Link to="/socials" className="ti-back">
          ← Socials
        </Link>
        <h1>Reddit</h1>
      </div>

      <div className="ti-filters ti-filters-mb">
        <FilterSelect
          value={subreddit}
          onChange={(v) => {
            if (v !== null) setSubreddit(v);
          }}
          placeholder="subreddit"
          options={SUBREDDITS as string[]}
          showAll={false}
        />

        <Input
          className="ti-search"
          placeholder="Search posts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <FilterSelect
          value={searchField}
          onChange={(v) => setSearchField(v ?? '')}
          placeholder="field"
          options={SEARCH_FIELDS as string[]}
          allLabel="all"
        />

        {posts && (
          <span className="ti-count">
            {filtered.length}
            {search ? ` / ${posts.length}` : ''} posts
          </span>
        )}
      </div>

      <StateHandler
        isPending={isPending}
        error={error}
        empty={posts?.length === 0}
        emptyMessage="No posts yet — sync runs every hour"
      >
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
