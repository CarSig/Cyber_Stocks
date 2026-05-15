import { useState, useCallback, useRef, useEffect, forwardRef, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { runSimulation, getSimulationPresets } from "@/api/stock.js";
import { createChart, LineSeries, createSeriesMarkers } from "lightweight-charts";
import DatePicker from "@/components/atoms/DatePicker.jsx";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function parseYMD(dateStr) {
  const [y, m, day] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, day);
}

function addDays(dateStr, n) {
  const d = parseYMD(dateStr);
  d.setDate(d.getDate() + n);
  return isNaN(d.getTime()) ? "" : localDateStr(d);
}

function safeOffsetDate(dateStr, ms) {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return null;
  return new Date(t + ms).toISOString().slice(0, 10);
}

function snapToWeekday(dateStr) {
  const d = parseYMD(dateStr);
  if (d.getDay() === 6) d.setDate(d.getDate() - 1);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return localDateStr(d);
}

function snapToNextWeekday(dateStr) {
  const d = parseYMD(dateStr);
  if (d.getDay() === 6) d.setDate(d.getDate() + 2); // Saturday → Monday
  if (d.getDay() === 0) d.setDate(d.getDate() + 1); // Sunday → Monday
  return localDateStr(d);
}

function fmt(v) {
  return v != null ? `$${Number(v).toFixed(2)}` : "—";
}

const SimChart = forwardRef(function SimChart({ history, transactions, mode }, outerRef) {
  const ref = useRef(null);
  function setRef(el) {
    ref.current = el;
    if (outerRef) outerRef.current = el;
  }
  useEffect(() => {
    if (!history?.length) return;
    const cv = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    const chart = createChart(ref.current, {
      width: ref.current.clientWidth,
      height: 220,
      layout: { background: { color: cv("--surface-0") }, textColor: cv("--text-primary") },
      grid: { vertLines: { color: cv("--surface-3") }, horzLines: { color: cv("--surface-3") } },
      timeScale: { timeVisible: false },
    });
    const s = chart.addSeries(LineSeries, { color: cv("--color-green"), lineWidth: 2 });
    s.setData(history.map((p) => ({ time: p.date, value: p.value })));

    if (transactions?.length) {
      const markers = transactions
        .map((t) => ({
          time: t.date,
          position: t.type === "buy" ? "belowBar" : "aboveBar",
          color: t.type === "buy" ? cv("--color-green") : cv("--color-red"),
          shape: t.type === "buy" ? "arrowUp" : "arrowDown",
          text: t.type === "buy" ? `B ${fmt(t.value)}` : `S ${Number(t.shares).toFixed(2)}sh`,
        }))
        .sort((a, b) => (a.time < b.time ? -1 : 1));
      createSeriesMarkers(s, markers);
    }

    chart.timeScale().fitContent();
    const el = ref.current;
    const obs = new ResizeObserver(() => chart.applyOptions({ width: el.clientWidth }));
    obs.observe(el);
    return () => {
      obs.disconnect();
      chart.remove();
    };
  }, [history, transactions, mode]);
  return <div ref={setRef} className="chart-container" />;
});

const calcProfit = (d) => d.totalInvested - d.cashWithdrawn - d.sharesValue;

let nextId = 1;

export default function Simulation({ ticker, quotes = [], onResult }) {
  const dates = useMemo(() => quotes.map((q) => new Date(q.date).toISOString().slice(0, 10)).sort(), [quotes]);
  const minDate = dates[0] ?? "";
  const maxDate = dates.at(-1) ?? "";
  const [actions, setActions] = useState([{ id: nextId++, date: "", type: "buy", value: "100" }]);
  const simChartRef = useRef(null);
  const portfolioChartRef = useRef(null);
  const priceChartRef = useRef(null);
  const fromTextRef = useRef(false);
  const [textMode, setTextMode] = useState(false);
  const [chartMode, setChartMode] = useState("portfolio");

  const actionsToText = (acts) =>
    acts
      .map((a) => {
        const n = a.type === "sell" ? -Math.abs(Number(a.value)) : Math.abs(Number(a.value));
        return `${a.date}, ${n}`;
      })
      .join("\n");

  const [textValue, setTextValue] = useState(() => actionsToText([{ date: "", type: "buy", value: "100" }]));

  useEffect(() => {
    if (fromTextRef.current) return;
    setTextValue(actionsToText(actions));
  }, [actions]);

  function handleTextChange(e) {
    const raw = e.target.value;
    setTextValue(raw);
    fromTextRef.current = true;
    const parsed = raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(",").map((s) => s.trim());
        if (parts.length !== 2) return null;
        const [date, numStr] = parts;
        const num = Number(numStr);
        if (isNaN(num) || num === 0) return null;
        return { id: nextId++, date, type: num > 0 ? "buy" : "sell", value: String(Math.abs(num)) };
      })
      .filter(Boolean);
    if (parsed.length) setActions(parsed);
    fromTextRef.current = false;
  }

  const { data: presets, error: presetsError, isLoading: presetsLoading } = useQuery({
    queryKey: ["simulation-presets", ticker],
    queryFn: () => getSimulationPresets(ticker),
    enabled: !!ticker,
    retry: false,
  });

  const applyPreset = useCallback(
    (name) => {
      if (!presets?.[name]) return;
      setActions(
        presets[name]
          .map((item) => {
            const num = Number(item.number);
            if (!isFinite(num) || num === 0) return null;
            return { id: nextId++, date: item.date, type: num > 0 ? "buy" : "sell", value: String(Math.abs(num)) };
          })
          .filter(Boolean),
      );
    },
    [presets],
  );

  const validActions = actions.filter((a) => a.date && a.value).map(({ date, type, value }) => ({ date, type, value: Number(value) }));

  const { mutate, data, isPending, error, reset } = useMutation({
    mutationFn: () => runSimulation(ticker, validActions),
    onSuccess: (result) => onResult?.(result),
  });

  const add = useCallback(() => {
    setActions((prev) => {
      const lastDate = prev.at(-1)?.date;
      const date = lastDate ? snapToNextWeekday(addDays(lastDate, 1)) : "";
      return [...prev, { id: nextId++, date, type: "buy", value: "100" }];
    });
  }, []);

  const remove = useCallback((id) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const update = useCallback((id, field, val) => {
    setActions((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: val } : a)));
  }, []);

  const clear = useCallback(() => {
    reset();
    setActions([{ id: nextId++, date: "", type: "buy", value: "100" }]);
  }, [reset]);

  const exportPdf = useCallback(() => {
    if (!data) return;
    const captureChart = (ref, label) => {
      const container = ref.current;
      if (!container) return "";
      const canvases = container.querySelectorAll("canvas");
      if (!canvases.length) return "";
      const first = canvases[0];
      const merged = document.createElement("canvas");
      merged.width = first.width;
      merged.height = first.height;
      const ctx = merged.getContext("2d");
      ctx.fillStyle = "#0f0f0f";
      ctx.fillRect(0, 0, merged.width, merged.height);
      canvases.forEach((c) => ctx.drawImage(c, 0, 0));
      return `<p style="margin:16px 0 4px;font-size:12px;color:#555;font-weight:600">${label}</p><img src="${merged.toDataURL("image/png")}" style="width:100%;border-radius:6px;" />`;
    };
    const chartImgTag = captureChart(portfolioChartRef, "Portfolio Value") + captureChart(priceChartRef, "Stock Price");
    const rows = data.transactions
      .map(
        (t) => `
      <tr>
        <td>${t.date}</td>
        <td style="color:${t.type === "buy" ? "#16a34a" : "#dc2626"}">${t.type.toUpperCase()}</td>
        <td>$${Number(t.value).toFixed(2)}</td>
        <td>${Number(t.shares).toFixed(4)}</td>
        <td>$${Number(t.price).toFixed(2)}</td>
        <td>${Number(t.sharesAfter).toFixed(4)}</td>
        <td>$${Number(t.portfolioValue).toFixed(2)}</td>
      </tr>`,
      )
      .join("");
    const profit = calcProfit(data);
    const html = `<!DOCTYPE html><html><head><title>Simulation — ${ticker}</title>
      <style>
        body { font-family: sans-serif; padding: 32px; color: #111; }
        h1 { margin-bottom: 4px; } p { margin: 2px 0; color: #555; }
        .stats { display: flex; flex-wrap: wrap; gap: 16px; margin: 24px 0; }
        .stat { border: 1px solid #ddd; border-radius: 8px; padding: 12px 18px; min-width: 140px; }
        .stat-label { font-size: 11px; color: #888; margin-bottom: 4px; }
        .stat-value { font-weight: 700; font-size: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { text-align: left; padding: 6px 8px; border-bottom: 2px solid #ddd; color: #555; }
        td { padding: 6px 8px; border-bottom: 1px solid #f0f0f0; }
        @media print { body { padding: 16px; } }
      </style></head><body>
      <h1>Simulation: ${ticker}</h1>
      <p>Generated ${new Date().toLocaleString()}</p>
      <div class="stats">
        <div class="stat"><div class="stat-label">Total invested</div><div class="stat-value">$${Number(data.totalInvested).toFixed(2)}</div></div>
        <div class="stat"><div class="stat-label">Shares held</div><div class="stat-value">${Number(data.finalShares).toFixed(4)}</div></div>
        <div class="stat"><div class="stat-label">Current shares value</div><div class="stat-value">$${Number(data.sharesValue).toFixed(2)}</div></div>
        <div class="stat"><div class="stat-label">Cash withdrawn</div><div class="stat-value">$${Number(data.cashWithdrawn).toFixed(2)}</div></div>
        <div class="stat"><div class="stat-label">Profit</div><div class="stat-value" style="color:${profit <= 0 ? "#16a34a" : "#dc2626"}">${profit > 0 ? "-" : ""}$${Math.abs(profit).toFixed(2)}</div></div>
      </div>
      ${chartImgTag}
      <table>
        <thead><tr><th>Date</th><th>Action</th><th>Value</th><th>Shares</th><th>Price</th><th>Shares after</th><th>Portfolio Value</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <script>window.onload = () => { window.print(); }</script>
    </body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, [data, ticker]);

  const insertBefore = useCallback((id) => {
    setActions((prev) => {
      const idx = prev.findIndex((a) => a.id === id);
      const next = [...prev];
      next.splice(idx, 0, { id: nextId++, date: "", type: "buy", value: "100" });
      return next;
    });
  }, []);

  return (
    <div>
      <div className="sim-editor-toggle">
        <Select onValueChange={(v) => v && applyPreset(v)} disabled={!presets}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder={presetsError ? `Error: ${presetsError.message}` : presetsLoading ? "Loading…" : "Load preset…"} />
          </SelectTrigger>
          <SelectContent>
            {presets && Object.keys(presets).map((name) => (
              <SelectItem key={name} value={name}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" onClick={() => setTextMode((v) => !v)}>
          {textMode ? "Visual editor" : "Text editor"}
        </Button>
      </div>

      {!textMode && (
        <div className="sim-actions">
          {actions.map((a, i) => {
            const prevDate = actions[i - 1]?.date;
            const actionMin = safeOffsetDate(prevDate, 86400000) ?? minDate;
            const nextDate = actions[i + 1]?.date;
            const actionMax = safeOffsetDate(nextDate, -86400000) ?? maxDate;
            return (
              <div key={a.id} className="sim-action-row">
                <DatePicker value={a.date} min={actionMin} max={actionMax} onChange={(v) => update(a.id, "date", v ? snapToWeekday(v) : v)} />
                <Select value={a.type} onValueChange={(v) => update(a.id, "type", v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="buy">Buy ($)</SelectItem>
                    <SelectItem value="sell">Sell (%)</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  min="0"
                  max={a.type === "sell" ? 100 : undefined}
                  placeholder={a.type === "buy" ? "Amount ($)" : "Percent (0–100)"}
                  value={a.value}
                  onChange={(e) => update(a.id, "value", e.target.value)}
                  className="form-input--number"
                />
                <Button variant="ghost" onClick={() => insertBefore(a.id)} title={`Insert event before this one (max ${actionMax})`}>
                  + before
                </Button>
                <Button variant="ghost" onClick={() => remove(a.id)}>✕</Button>
              </div>
            );
          })}
        </div>
      )}

      {textMode && (
        <Textarea
          value={textValue}
          onChange={handleTextChange}
          placeholder={"2025-01-15, 100\n2025-06-01, -50"}
          rows={Math.max(3, actions.length + 1)}
          className="sim-textarea"
        />
      )}

      <div className="sim-controls">
        {!textMode && (
          <Button variant="ghost" onClick={add}>+ Add action</Button>
        )}
        <Button onClick={() => mutate()} disabled={isPending || validActions.length === 0}>
          {isPending ? "Running…" : "Run simulation"}
        </Button>
        <Button variant="ghost" onClick={clear}>Clear</Button>
        {data && (
          <Button variant="ghost" onClick={exportPdf}>Export PDF</Button>
        )}
      </div>

      {error && <p className="error-text">{error.message}</p>}

      {data && (
        <div style={{ position: "relative", overflow: "hidden" }}>
          <div className="sim-stats">
            {(() => {
              const profit = calcProfit(data);
              const profitColor = profit <= 0 ? "var(--color-green)" : "var(--color-red)";
              const percentage = (profit / data.totalInvested) * 100;
              return [
                { label: "Total invested", value: fmt(data.totalInvested) },
                { label: "Shares held", value: Number(data.finalShares).toFixed(4) },
                { label: "Current shares value", value: fmt(data.sharesValue) },
                { label: "Cash withdrawn", value: fmt(data.cashWithdrawn) },
                { label: "Profit", value: (profit > 0 ? "-" : "") + fmt(Math.abs(profit)), color: profitColor },
                {
                  label: "Profit Percentage",
                  // Use Math.abs to clean the number, and logic to set the sign
                  value: (profit > 0 ? "-" : "") + Math.abs(percentage).toFixed(2) + "%",
                  color: profitColor,
                },
              ];
            })().map(({ label, value, color }) => (
              <div key={label} className="stat-card">
                <div className="stat-label">{label}</div>
                <div className="stat-value" style={color ? { color } : undefined}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          <div className="sim-chart-controls">
            <button
              className={`sim-chart-btn${chartMode === "portfolio" ? " active" : ""}`}
              onClick={() => setChartMode("portfolio")}
            >
              Portfolio Value
            </button>
            <button
              className={`sim-chart-btn${chartMode === "price" ? " active" : ""}`}
              onClick={() => setChartMode("price")}
            >
              Stock Price
            </button>
          </div>
          <SimChart
            ref={simChartRef}
            mode={chartMode}
            history={(() => {
              const src = chartMode === "price" ? data.priceHistory : data.portfolioHistory;
              const t = data.transactions;
              if (!t.length) return src;
              const from = t[0].date;
              const to = t.at(-1).date;
              return src.filter((p) => p.date >= from && p.date <= to);
            })()}
            transactions={data.transactions}
          />
          <div style={{ position: "absolute", left: "-9999px", width: "800px", pointerEvents: "none" }}>
            <SimChart
              ref={portfolioChartRef}
              mode="portfolio"
              history={(() => {
                const t = data.transactions;
                if (!t.length) return data.portfolioHistory;
                const from = t[0].date;
                const to = t.at(-1).date;
                return data.portfolioHistory.filter((p) => p.date >= from && p.date <= to);
              })()}
              transactions={data.transactions}
            />
            <SimChart
              ref={priceChartRef}
              mode="price"
              history={(() => {
                const t = data.transactions;
                if (!t.length) return data.priceHistory;
                const from = t[0].date;
                const to = t.at(-1).date;
                return data.priceHistory.filter((p) => p.date >= from && p.date <= to);
              })()}
              transactions={data.transactions}
            />
          </div>

          {data.transactions.length > 0 && (
            <table className="sim-table">
              <thead>
                <tr>
                  {["Date", "Action", "Value", "Shares", "Price", "Shares after", "Portfolio Value"].map((h) => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.transactions.map((t, i) => (
                  <tr key={i}>
                    <td>{t.date}</td>
                    <td className={t.type === "buy" ? "sim-buy" : "sim-sell"}>{t.type.toUpperCase()}</td>
                    <td>{fmt(t.value)}</td>
                    <td>{Number(t.shares).toFixed(4)}</td>
                    <td>{fmt(t.price)}</td>
                    <td>{Number(t.sharesAfter).toFixed(4)}</td>
                    <td>{fmt(t.portfolioValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
