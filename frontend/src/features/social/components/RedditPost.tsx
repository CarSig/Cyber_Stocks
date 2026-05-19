import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import StateHandler from '@/components/common/StateHandler';
import { getComments } from '@/api/reddit';
import CountBadge from '@/components/common/CountBadge';
import TagBadge from '@/components/common/TagBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import CommentNode from './CommentNode';
import type { RedditPost as RedditPostType } from '@/types';

type CommentsProps = { subreddit: string; postId: string };

function Comments({ subreddit, postId }: CommentsProps) {
  const { data, isPending, error } = useQuery({
    queryKey: ['reddit-comments', subreddit, postId],
    queryFn: () => getComments(subreddit, postId),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <StateHandler
      isPending={isPending}
      error={error}
      empty={!data?.length}
      loadingMessage="Loading comments…"
      emptyMessage="No comments"
    >
      <div className="flex flex-col gap-3 mt-3">
        {(data ?? []).map((c) => (
          <CommentNode key={c.id} comment={c} />
        ))}
      </div>
    </StateHandler>
  );
}

type RedditPostProps = { post: RedditPostType; subreddit: string };

export default function RedditPost({ post, subreddit }: RedditPostProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : ''}
          </span>
          <CountBadge count={post.score} icon="▲" />
          <TagBadge>💬 {post.numComments}</TagBadge>
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
          {expanded ? '▲ hide comments' : `▼ show comments (${post.numComments})`}
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
