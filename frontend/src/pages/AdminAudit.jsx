import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuditLog } from "../api.js";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ACTION_LABELS = {
  login: "Login",
  register: "Register",
  google_auth: "Google Auth",
  view_ticker: "View Ticker",
  correlate: "Correlate",
  simulate: "Simulate",
  research: "Research",
  chat: "Chat",
  trump_correlation: "Trump Correlation",
  trump_weekly_impact: "Trump Weekly Impact",
};

const ACTION_COLORS = {
  login: "var(--color-green)",
  register: "var(--color-blue-toggle)",
  google_auth: "var(--color-blue-toggle)",
  simulate: "var(--color-amber)",
  research: "var(--accent)",
  chat: "var(--accent)",
};

const PAGE_SIZE = 50;

function formatMeta(meta) {
  if (!meta || !Object.keys(meta).length) return "—";
  return Object.entries(meta).map(([k, v]) => `${k}: ${v}`).join(", ");
}

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { dateStyle: "short", timeStyle: "medium" });
}

export default function AdminAudit() {
  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState("");

  const { data, isPending, error } = useQuery({
    queryKey: ["audit", page, actionFilter],
    queryFn: () => getAuditLog({
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
      action: actionFilter || undefined,
    }),
  });

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;

  return (
    <div className="audit-page">
      <div className="audit-header">
        <h1>Audit Log</h1>
        <div className="audit-filters">
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setPage(0); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All actions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All actions</SelectItem>
              {Object.entries(ACTION_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {data && (
            <span className="audit-total">{data.total} entries</span>
          )}
        </div>
      </div>

      {isPending && <p className="audit-loading">Loading…</p>}
      {error && <p className="audit-error">{error.message}</p>}

      {data && (
        <>
          <div className="audit-table-wrap">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((e) => (
                  <tr key={e.id}>
                    <td className="audit-time">{formatTime(e.timestamp)}</td>
                    <td className="audit-user">{e.username}</td>
                    <td>
                      {e.role === "admin" && (
                        <span className="navbar-role">admin</span>
                      )}
                    </td>
                    <td>
                      <span
                        className="audit-action"
                        style={{ color: ACTION_COLORS[e.action] ?? "var(--text-faint)" }}
                      >
                        {ACTION_LABELS[e.action] ?? e.action}
                      </span>
                    </td>
                    <td className="audit-meta">{formatMeta(e.meta)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="audit-pagination">
              <Button variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Prev</Button>
              <span className="audit-page-info">Page {page + 1} of {totalPages}</span>
              <Button variant="ghost" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>Next →</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
