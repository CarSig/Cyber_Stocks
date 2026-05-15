import { useNotifications } from '@/context/NotificationContext';
import type { AppNotification } from '@/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { timeStyle: 'short' });
}

export default function NotificationBell() {
  const ctx = useNotifications();
  const notifications = ctx?.notifications ?? [];
  const unread = ctx?.unread ?? 0;
  const markAllRead = ctx?.markAllRead ?? (() => {});
  const dismiss = ctx?.dismiss ?? (() => {});
  const clearAll = ctx?.clearAll ?? (() => {});

  return (
    <DropdownMenu onOpenChange={(open: boolean) => open && markAllRead()}>
      <DropdownMenuTrigger
        className="notif-bell relative inline-flex items-center justify-center rounded-md p-2 hover:bg-accent focus-visible:outline-none"
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && (
          <Badge className="notif-badge absolute -top-1 -right-1 h-4 min-w-4 px-1 text-xs">{unread}</Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="notif-dropdown w-80">
        <div className="flex items-center justify-between px-2 py-1.5">
          <span className="text-sm font-semibold">Notifications</span>
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="h-auto px-2 py-0.5 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear all
            </button>
          )}
        </div>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="notif-empty px-2 py-3 text-center text-sm text-muted-foreground">No notifications yet</p>
        ) : (
          notifications.map((n: AppNotification) => (
            <DropdownMenuItem
              key={n.id}
              className={`notif-item flex-col items-start gap-0.5${n.read ? '' : ' font-medium'}`}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {n.type === 'stocks.updated' &&
                  (n as Record<string, unknown>).changes &&
                  ((n as Record<string, unknown>).changes as Array<{ ticker: string; changePct: number }>).length ? (
                    <div className="notif-stocks flex flex-wrap gap-x-3 gap-y-0.5">
                      {((n as Record<string, unknown>).changes as Array<{ ticker: string; changePct: number }>).map(
                        ({ ticker, changePct }) => (
                          <span
                            key={ticker}
                            style={{ color: changePct >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}
                          >
                            {ticker} {changePct >= 0 ? '+' : ''}
                            {changePct.toFixed(1)}%
                          </span>
                        ),
                      )}
                    </div>
                  ) : n.type === 'news.analyzed' ? (
                    <div>
                      <span className="notif-ticker font-semibold">
                        {(n as Record<string, unknown>).ticker as string}
                      </span>
                      <span
                        style={{
                          color:
                            ((n as Record<string, unknown>).sentiment as number) >= 0.1
                              ? 'var(--color-green)'
                              : ((n as Record<string, unknown>).sentiment as number) <= -0.1
                                ? 'var(--color-red)'
                                : 'var(--text-muted)',
                        }}
                      >
                        {((n as Record<string, unknown>).sentiment as number) >= 0.6
                          ? ' ▲▲ '
                          : ((n as Record<string, unknown>).sentiment as number) >= 0.1
                            ? ' ▲ '
                            : ((n as Record<string, unknown>).sentiment as number) <= -0.6
                              ? ' ▼▼ '
                              : ((n as Record<string, unknown>).sentiment as number) <= -0.1
                                ? ' ▼ '
                                : ' ● '}
                      </span>
                      <span className="notif-message">{n.message}</span>
                    </div>
                  ) : (
                    <span className="notif-message">{n.message}</span>
                  )}
                  <span className="notif-time text-xs text-muted-foreground">
                    {formatTime((n as Record<string, unknown>).at as string)}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismiss(n.id);
                  }}
                  className="shrink-0 text-muted-foreground hover:text-foreground leading-none mt-0.5"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
