import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { BASE } from '@/api/core';
import type { AppNotification } from '@/types';

type NotificationContextValue = {
  notifications: AppNotification[];
  unread: number;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  clearAll: () => void;
};

const STORAGE_KEY = 'notifications';
const NotificationContext = createContext<NotificationContextValue | null>(null);

function load(): AppNotification[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as AppNotification[];
  } catch {
    return [];
  }
}

function save(notifications: AppNotification[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>(load);
  const [unread, setUnread] = useState(() => load().filter((n) => !n.read).length);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('auth_token') ?? '';
    const es = new EventSource(`${BASE}/notifications/stream?token=${encodeURIComponent(token)}`);
    esRef.current = es;

    es.onmessage = (e: MessageEvent<string>) => {
      const data = JSON.parse(e.data) as Partial<AppNotification> & { type?: string };
      if (data.type === 'connected' || data.type === 'ping') return;
      const notification: AppNotification = {
        ...data,
        id: crypto.randomUUID(),
        read: false,
        type: data.type ?? 'info',
      };
      setNotifications((prev) => {
        const next = [notification, ...prev].slice(0, 50);
        save(next);
        return next;
      });
      setUnread((n) => n + 1);
    };

    es.onerror = () => es.close();

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [user]);

  function markAllRead(): void {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      save(next);
      return next;
    });
    setUnread(0);
  }

  function dismiss(id: string): void {
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      save(next);
      return next;
    });
    setUnread((n) => Math.max(0, n - 1));
  }

  function clearAll(): void {
    setNotifications([]);
    setUnread(0);
    localStorage.removeItem(STORAGE_KEY);
  }

  return (
    <NotificationContext.Provider value={{ notifications, unread, markAllRead, dismiss, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications(): NotificationContextValue | null {
  return useContext(NotificationContext);
}
