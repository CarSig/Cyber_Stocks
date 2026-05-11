import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthContext.jsx";

const BASE = "http://localhost:3000";
const STORAGE_KEY = "notifications";
const NotificationContext = createContext(null);

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function save(notifications) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
}

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(load);
  const [unread, setUnread] = useState(() => load().filter((n) => !n.read).length);
  const esRef = useRef(null);

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem("auth_token") ?? "";
    const es = new EventSource(`${BASE}/notifications/stream?token=${encodeURIComponent(token)}`);
    esRef.current = es;

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === "connected" || data.type === "ping") return;
      const notification = { ...data, id: crypto.randomUUID(), read: false };
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

  function markAllRead() {
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      save(next);
      return next;
    });
    setUnread(0);
  }

  function dismiss(id) {
    setNotifications((prev) => {
      const next = prev.filter((n) => n.id !== id);
      save(next);
      return next;
    });
    setUnread((n) => Math.max(0, n - 1));
  }

  function clearAll() {
    setNotifications([]);
    setUnread(0);
    localStorage.removeItem(STORAGE_KEY);
  }

  return <NotificationContext.Provider value={{ notifications, unread, markAllRead, dismiss, clearAll }}>{children}</NotificationContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications() {
  return useContext(NotificationContext);
}
