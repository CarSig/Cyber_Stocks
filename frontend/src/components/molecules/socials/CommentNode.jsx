import { useState } from 'react';
import CountBadge from '@/components/atoms/CountBadge';

export default function CommentNode({ comment, depth = 0 }) {
  const [collapsed, setCollapsed] = useState(false);
  const hasReplies = comment.replies?.length > 0;

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        {hasReplies && (
          <button
            onClick={() => setCollapsed((v) => !v)}
            style={{
              fontSize: '9px',
              color: 'var(--muted-foreground)',
              cursor: 'pointer',
              background: 'none',
              border: 'none',
              padding: '0 2px',
              lineHeight: 1,
            }}
          >
            {collapsed ? '▶' : '▼'}
          </button>
        )}
        <span className="text-xs font-medium text-(--color-blue)">u/{comment.author}</span>
        <CountBadge count={comment.score} icon="▲" />
        <span className="text-[10px] text-muted-foreground">{new Date(comment.createdAt).toLocaleDateString()}</span>
      </div>

      <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap mt-1 mb-1">{comment.body}</p>

      {hasReplies && !collapsed && (
        <div
          style={{
            marginLeft: '20px',
            paddingLeft: '12px',
            borderLeft: '2px solid var(--border)',
            marginTop: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {comment.replies.map((r) => (
            <CommentNode key={r.id} comment={r} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
