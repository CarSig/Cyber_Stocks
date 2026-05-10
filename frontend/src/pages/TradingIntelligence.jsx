import { useState, useEffect, useRef, useMemo } from "react";
import "./TradingIntelligence.css";

// ── Seeded RNG ────────────────────────────────────────────────
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function genQuotes(seed, days, startPrice, drift, vol) {
  const rng = mulberry32(seed);
  const out = [];
  let price = startPrice;
  const today = new Date("2026-05-08T00:00:00Z");
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    if (d.getUTCDay() === 0 || d.getUTCDay() === 6) continue;
    const change = (rng() - 0.5) * 2 * vol + drift;
    const open = price;
    const close = Math.max(1, price * (1 + change / 100));
    const high = Math.max(open, close) * (1 + rng() * vol * 0.005);
    const low = Math.min(open, close) * (1 - rng() * vol * 0.005);
    const volume = Math.floor(2_000_000 + rng() * 80_000_000);
    out.push({ date: d.toISOString().slice(0, 10), t: d.getTime(), open, high, low, close, volume });
    price = close;
  }
  return out;
}

// ── Static data ───────────────────────────────────────────────
const TICKERS = [
  { ticker: "NVDA", name: "NVIDIA",    sector: "Semis",      mcap: 3.21e12, peg: 1.4, _seed: 11, _start: 92,  _drift: 0.18, _vol: 2.6 },
  { ticker: "AAPL", name: "Apple",     sector: "Hardware",   mcap: 2.94e12, peg: 1.9, _seed: 22, _start: 178, _drift: 0.05, _vol: 1.4 },
  { ticker: "MSFT", name: "Microsoft", sector: "Software",   mcap: 3.07e12, peg: 2.1, _seed: 33, _start: 388, _drift: 0.07, _vol: 1.3 },
  { ticker: "GOOGL",name: "Alphabet",  sector: "Internet",   mcap: 1.92e12, peg: 1.3, _seed: 44, _start: 142, _drift: 0.06, _vol: 1.6 },
  { ticker: "META", name: "Meta",      sector: "Internet",   mcap: 1.31e12, peg: 1.1, _seed: 55, _start: 348, _drift: 0.09, _vol: 2.0 },
  { ticker: "AMZN", name: "Amazon",    sector: "Internet",   mcap: 1.84e12, peg: 1.7, _seed: 66, _start: 168, _drift: 0.04, _vol: 1.7 },
  { ticker: "TSLA", name: "Tesla",     sector: "Auto",       mcap: 6.10e11, peg: 3.4, _seed: 77, _start: 192, _drift: -0.04,_vol: 3.3 },
  { ticker: "AMD",  name: "AMD",       sector: "Semis",      mcap: 2.57e11, peg: 1.6, _seed: 88, _start: 158, _drift: 0.10, _vol: 2.8 },
  { ticker: "JPM",  name: "JPMorgan",  sector: "Financials", mcap: 5.42e11, peg: 1.2, _seed: 99, _start: 188, _drift: 0.03, _vol: 1.0 },
  { ticker: "V",    name: "Visa",      sector: "Financials", mcap: 5.18e11, peg: 1.5, _seed: 110,_start: 268, _drift: 0.04, _vol: 0.9 },
];

const QUOTES = Object.fromEntries(
  TICKERS.map(t => [t.ticker, genQuotes(t._seed, 540, t._start, t._drift, t._vol)])
);

function summarize(ticker) {
  const meta = TICKERS.find(t => t.ticker === ticker);
  const quotes = QUOTES[ticker];
  const last = quotes[quotes.length - 1];
  const prev = quotes[quotes.length - 2];
  const day = ((last.close - prev.close) / prev.close) * 100;
  const wkAgo = quotes[quotes.length - 6] || prev;
  const moAgo = quotes[quotes.length - 22] || prev;
  const yrAgo = quotes[Math.max(0, quotes.length - 252)] || quotes[0];
  const high52 = Math.max(...quotes.slice(-252).map(q => q.high));
  const low52  = Math.min(...quotes.slice(-252).map(q => q.low));
  return {
    ...meta,
    price: last.close,
    dayChangePct: day,
    dayChange: last.close - prev.close,
    wkChangePct:  ((last.close - wkAgo.close) / wkAgo.close) * 100,
    moChangePct:  ((last.close - moAgo.close) / moAgo.close) * 100,
    yrChangePct:  ((last.close - yrAgo.close) / yrAgo.close) * 100,
    high52, low52,
    volume: last.volume,
    posInRange: (last.close - low52) / (high52 - low52),
  };
}

const NEWS_TEMPLATES = {
  NVDA: [
    { t: "Blackwell shipments accelerate; supply tight into Q3",        sent:  0.74, src: "Reuters",       tag: "AI infra"    },
    { t: "Hyperscaler capex revised higher on inference demand",        sent:  0.62, src: "Bloomberg",     tag: "Capex"       },
    { t: "Export controls expanded for B200 to certain regions",        sent: -0.41, src: "WSJ",           tag: "Geopolitics" },
    { t: "CFO interview: software margins now material, gross > 75%",   sent:  0.55, src: "CNBC",          tag: "Margins"     },
    { t: "Short-seller note questions order durability past 2027",      sent: -0.32, src: "Seeking Alpha", tag: "Short"       },
    { t: "Cyber: CVE-2026-1841 disclosed in driver stack",              sent: -0.18, src: "NVD",           tag: "CVE"         },
  ],
  AAPL: [
    { t: "Vision Pro 2 leak: lighter, $2,499, holiday launch",          sent:  0.48, src: "The Information", tag: "Hardware" },
    { t: "Services revenue hits all-time high; ARPU up 9% YoY",         sent:  0.66, src: "Reuters",         tag: "Services" },
    { t: "iPhone 17 Pro production constrained by camera module",       sent: -0.22, src: "Bloomberg",        tag: "Supply"   },
    { t: "EU DMA: App Store fee ruling expected within weeks",          sent: -0.35, src: "FT",               tag: "EU"       },
    { t: "Apple Intelligence rollout reaches 38 markets",               sent:  0.28, src: "Apple Newsroom",   tag: "AI"       },
  ],
  MSFT: [
    { t: "Azure AI run-rate crosses $20B; Copilot attach > 60%",        sent:  0.71, src: "Bloomberg",       tag: "Cloud"  },
    { t: "Activision integration completes, gaming margin expands",     sent:  0.42, src: "Reuters",         tag: "Gaming" },
    { t: "Datacenter water-use scrutiny in Arizona deepens",            sent: -0.21, src: "AP",              tag: "ESG"    },
    { t: "OpenAI partnership renegotiation: terms reportedly favorable",sent:  0.48, src: "The Information", tag: "AI"     },
  ],
  GOOGL: [
    { t: "Gemini 3 benchmarks lead on reasoning suites",                sent:  0.58, src: "Bloomberg", tag: "AI"        },
    { t: "DOJ remedy phase: structural separations on the table",       sent: -0.52, src: "WSJ",       tag: "Antitrust" },
    { t: "YouTube Shorts monetization parity reached",                  sent:  0.31, src: "Reuters",   tag: "Ads"       },
    { t: "Cloud Q1 grows 32%, ahead of Street",                         sent:  0.55, src: "CNBC",      tag: "Cloud"     },
  ],
  META: [
    { t: "Reels engagement +28%; ad load steady",      sent:  0.46, src: "Bloomberg",  tag: "Ads"     },
    { t: "Reality Labs loss narrower than feared",     sent:  0.34, src: "Reuters",    tag: "Hardware"},
    { t: "Llama 4 open weights released",              sent:  0.51, src: "TechCrunch", tag: "AI"      },
    { t: "EU teen-safety fines under appeal",          sent: -0.28, src: "FT",         tag: "EU"      },
  ],
  AMZN: [
    { t: "AWS Trainium2 books $4B in commitments",     sent:  0.63, src: "Reuters",   tag: "Cloud"  },
    { t: "Retail margin lifts on logistics automation",sent:  0.37, src: "Bloomberg", tag: "Retail" },
    { t: "Drivers strike at three FCs ahead of Prime", sent: -0.31, src: "AP",        tag: "Labor"  },
  ],
  TSLA: [
    { t: "Robotaxi fleet expands to Phoenix",          sent:  0.42, src: "Bloomberg", tag: "AV"    },
    { t: "Q1 deliveries miss; ASP holds",              sent: -0.38, src: "Reuters",   tag: "Demand"},
    { t: "NHTSA opens probe into FSD edge cases",      sent: -0.44, src: "NHTSA",     tag: "Safety"},
    { t: "Energy storage backlog at all-time high",    sent:  0.51, src: "Reuters",   tag: "Energy"},
  ],
  AMD:  [
    { t: "MI350 datacenter wins disclosed; Oracle adds capacity", sent:  0.57, src: "Bloomberg", tag: "AI"    },
    { t: "Server share gain accelerates vs Intel",                sent:  0.41, src: "Reuters",   tag: "Share" },
    { t: "Client weakness in EMEA",                               sent: -0.26, src: "CNBC",      tag: "Client"},
  ],
  JPM:  [
    { t: "NII guide raised on stickier deposits",        sent:  0.48, src: "Bloomberg", tag: "NII" },
    { t: "Investment banking fees rebound 21% YoY",      sent:  0.39, src: "Reuters",   tag: "IB"  },
    { t: "CRE reserve build edges higher",               sent: -0.22, src: "WSJ",       tag: "CRE" },
  ],
  V:    [
    { t: "Cross-border volume +14%; travel tailwind",    sent:  0.45, src: "Reuters",   tag: "X-border"},
    { t: "EU interchange caps proposal under consult",   sent: -0.31, src: "FT",        tag: "EU"      },
    { t: "Stablecoin settlement pilot expands to 14 banks",sent:0.38, src: "Bloomberg", tag: "Crypto"  },
  ],
};

function newsFor(ticker) {
  const rng = mulberry32(ticker.charCodeAt(0) * 31 + ticker.charCodeAt(1));
  const today = new Date("2026-05-08T00:00:00Z");
  return (NEWS_TEMPLATES[ticker] || []).map((n, i) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - Math.floor(rng() * 18) - i);
    return { id: `${ticker}-${i}`, title: n.t, sentiment: n.sent, publisher: n.src, tag: n.tag, t: d.getTime() };
  }).sort((a, b) => b.t - a.t);
}

const EVENT_TEMPLATES = {
  NVDA:  [{ kind: "cve",  title: "CVE-2026-1841 driver",   sev: "high"     }, { kind: "news", title: "Blackwell ramp call",    sev: "pos" }, { kind: "news", title: "Export-control update", sev: "neg" }],
  AAPL:  [{ kind: "kev",  title: "WebKit RCE exploited",   sev: "critical" }, { kind: "news", title: "EU DMA ruling",           sev: "neg" }, { kind: "news", title: "Vision Pro 2 leak",     sev: "pos" }],
  MSFT:  [{ kind: "cve",  title: "CVE-2026-2210 Exchange", sev: "high"     }, { kind: "news", title: "Azure AI guidance raised", sev: "pos" }],
  GOOGL: [{ kind: "news", title: "DOJ remedy hearing",     sev: "neg"      }, { kind: "news", title: "Gemini 3 launch",          sev: "pos" }],
  META:  [{ kind: "news", title: "Llama 4 release",        sev: "pos"      }],
  AMZN:  [{ kind: "news", title: "Trainium2 commitments",  sev: "pos"      }],
  TSLA:  [{ kind: "news", title: "NHTSA probe",            sev: "neg"      }, { kind: "news", title: "Robotaxi expansion",       sev: "pos" }],
  AMD:   [{ kind: "news", title: "MI350 wins disclosed",   sev: "pos"      }],
  JPM:   [{ kind: "news", title: "NII guide raised",       sev: "pos"      }],
  V:     [{ kind: "news", title: "EU interchange caps",    sev: "neg"      }],
};

function eventsFor(ticker) {
  const rng = mulberry32(ticker.charCodeAt(0) * 17 + 1);
  const quotes = QUOTES[ticker];
  return (EVENT_TEMPLATES[ticker] || []).map((e, i) => {
    const idx = Math.floor(quotes.length * (0.3 + rng() * 0.65));
    const q = quotes[idx];
    return { ...e, id: `${ticker}-ev-${i}`, t: q.t, date: q.date, price: q.close };
  }).sort((a, b) => a.t - b.t);
}

const ENTITIES = [
  { id: "nvidia",    name: "Nvidia",        sentiment:  0.62, articles: 142, mentions: 380, role: "subject",   tags: ["AI infra","Capex"]    },
  { id: "apple",     name: "Apple",         sentiment:  0.34, articles:  98, mentions: 215, role: "subject",   tags: ["Services","EU"]       },
  { id: "microsoft", name: "Microsoft",     sentiment:  0.58, articles: 121, mentions: 304, role: "subject",   tags: ["Cloud","AI"]          },
  { id: "tesla",     name: "Tesla",         sentiment: -0.18, articles:  87, mentions: 192, role: "subject",   tags: ["AV","Safety"]         },
  { id: "openai",    name: "OpenAI",        sentiment:  0.41, articles:  64, mentions: 188, role: "mentioned", tags: ["AI","Partner"]        },
  { id: "tsmc",      name: "TSMC",          sentiment:  0.29, articles:  52, mentions:  98, role: "supplier",  tags: ["Foundry"]             },
  { id: "meta",      name: "Meta",          sentiment:  0.22, articles:  71, mentions: 156, role: "subject",   tags: ["Ads","AI"]            },
  { id: "doj",       name: "US DOJ",        sentiment: -0.46, articles:  29, mentions:  48, role: "regulator", tags: ["Antitrust"]           },
  { id: "eu",        name: "EU Commission", sentiment: -0.35, articles:  41, mentions:  82, role: "regulator", tags: ["DMA","Privacy"]       },
  { id: "amd",       name: "AMD",           sentiment:  0.31, articles:  44, mentions:  91, role: "subject",   tags: ["AI","Server"]         },
];

const SIGNALS = [
  { id: "rate_cut",    label: "Rate-cut path",         count: 38, dir: "up"   },
  { id: "capex",       label: "AI capex revisions",    count: 64, dir: "up"   },
  { id: "export_ctrl", label: "Export controls",       count: 22, dir: "up"   },
  { id: "antitrust",   label: "Antitrust action",      count: 17, dir: "up"   },
  { id: "consumer",    label: "Consumer softening",    count: 11, dir: "flat" },
  { id: "energy",      label: "Energy / power demand", count: 28, dir: "up"   },
  { id: "cyber",       label: "Cyber disclosures",     count: 31, dir: "up"   },
  { id: "china",       label: "China demand",          count: 19, dir: "down" },
];

const CHAT_PRESETS = [
  { q: "Why is it moving today?",          a: "Today's tape is led by positive read-through from hyperscaler capex revisions and a soft USD print lifting high-beta names. Volume is ~1.3× the 20-day average — directional, not a squeeze." },
  { q: "Biggest risk in 30 days?",         a: "Earnings is the obvious catalyst. Beyond that: a) export-control headlines — sentiment swings have averaged -0.4; b) Q2 capex digestion if any hyperscaler trims; c) the antitrust calendar in the EU." },
  { q: "How does it correlate to comps?",  a: "90-day: AMD 0.81, TSM 0.74, AVGO 0.69, MSFT 0.41. Lead-lag tells you this name leads AMD by ~1 day with r≈0.34 at lag-1." },
  { q: "Summarize news this week.",        a: "Net sentiment +0.42 across 28 articles. Bullish: Blackwell shipments tracking ahead, hyperscaler capex revised up, software margins now material. Bearish: expanded export controls and a short-seller note on order durability." },
];

// ── Formatters ────────────────────────────────────────────────
function fmtPrice(v) { return v == null ? "—" : v.toFixed(2); }
function fmtCompact(v) {
  if (v == null) return "—";
  if (Math.abs(v) >= 1e12) return (v / 1e12).toFixed(2) + "T";
  if (Math.abs(v) >= 1e9)  return (v / 1e9).toFixed(2) + "B";
  if (Math.abs(v) >= 1e6)  return (v / 1e6).toFixed(2) + "M";
  if (Math.abs(v) >= 1e3)  return (v / 1e3).toFixed(1) + "K";
  return String(v);
}
function fmtPct(v, sign = true) {
  if (v == null) return "—";
  return (sign && v > 0 ? "+" : "") + v.toFixed(2) + "%";
}
function fmtDateShort(t) {
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ── Sparkline ─────────────────────────────────────────────────
function Sparkline({ quotes, w = 80, h = 24 }) {
  const slice = quotes.slice(-60);
  const lo = Math.min(...slice.map(q => q.close));
  const hi = Math.max(...slice.map(q => q.close));
  const up = slice[slice.length - 1].close >= slice[0].close;
  const path = slice.map((q, i) => {
    const x = (i / (slice.length - 1)) * w;
    const y = h - ((q.close - lo) / (hi - lo || 1)) * h;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" width={w} height={h} style={{ display: "block" }}>
      <path d={path} fill="none" stroke={up ? "var(--ti-up)" : "var(--ti-down)"} strokeWidth="1.2" />
    </svg>
  );
}

// ── SentMeter ─────────────────────────────────────────────────
function SentMeter({ v }) {
  const pct = ((v + 1) / 2) * 100;
  const color = v > 0.05 ? "var(--ti-up)" : v < -0.05 ? "var(--ti-down)" : "var(--ti-faint)";
  return (
    <div className="ti-sent-meter">
      <div className="ti-sent-track">
        <div className="ti-sent-mid" />
        <div className="ti-sent-fill" style={{ left: v >= 0 ? "50%" : `${pct}%`, width: `${Math.abs(v) * 50}%`, background: color }} />
      </div>
    </div>
  );
}

// ── WatchlistSidebar ──────────────────────────────────────────
function WatchlistSidebar({ selected, onSelect }) {
  const upCount = TICKERS.filter(t => summarize(t.ticker).dayChangePct >= 0).length;
  return (
    <aside className="ti-wl">
      <div className="ti-wl-head">
        <div className="ti-wl-title">Watchlist</div>
      </div>
      <div className="ti-wl-list">
        {TICKERS.map(meta => {
          const s = summarize(meta.ticker);
          const pos = s.dayChangePct >= 0;
          return (
            <button
              key={meta.ticker}
              className={`ti-wl-row${meta.ticker === selected ? " is-active" : ""}`}
              onClick={() => onSelect(meta.ticker)}
            >
              <div>
                <div className="ti-wl-tk">{meta.ticker}</div>
                <div className="ti-wl-name">{meta.name}</div>
              </div>
              <Sparkline quotes={QUOTES[meta.ticker]} w={70} h={22} />
              <div className="ti-wl-px">
                <div className="ti-wl-price">{fmtPrice(s.price)}</div>
                <div className={`ti-wl-chg ${pos ? "ti-pos" : "ti-neg"}`}>
                  {pos ? "▲" : "▼"} {fmtPct(s.dayChangePct, false)}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <div className="ti-wl-foot">
        <span className={`ti-dot ti-dot-up`} /> {upCount} up
        <span style={{ opacity: 0.5 }}> · </span>
        <span className={`ti-dot ti-dot-down`} /> {TICKERS.length - upCount} down
        <span style={{ opacity: 0.5 }}> · </span>
        <span className="ti-muted">live</span>
      </div>
    </aside>
  );
}

// ── TickerHeader ──────────────────────────────────────────────
function TickerHeader({ summary }) {
  const pos = summary.dayChangePct >= 0;
  return (
    <div className="ti-tk-header">
      <div>
        <div className="ti-tk-symbol">{summary.ticker}</div>
        <div className="ti-tk-name">{summary.name} <span className="ti-muted">· {summary.sector}</span></div>
      </div>
      <div>
        <div className="ti-tk-price">${fmtPrice(summary.price)}</div>
        <div className={`ti-tk-change ${pos ? "ti-pos" : "ti-neg"}`}>
          <span style={{ fontSize: 9 }}>{pos ? "▲" : "▼"}</span>
          <span>{fmtPct(summary.dayChangePct)}</span>
          <span className="ti-muted">· ${Math.abs(summary.dayChange).toFixed(2)} today</span>
        </div>
      </div>
      <div>
        <div className="ti-rg-labels">
          <span>52w Low ${fmtPrice(summary.low52)}</span>
          <span>52w High ${fmtPrice(summary.high52)}</span>
        </div>
        <div className="ti-rg-track">
          <div className="ti-rg-fill" style={{ width: `${summary.posInRange * 100}%` }} />
          <div className="ti-rg-marker" style={{ left: `${summary.posInRange * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

// ── KPIStrip ──────────────────────────────────────────────────
function KPIStrip({ summary }) {
  const items = [
    { k: "Market Cap", v: "$" + fmtCompact(summary.mcap) },
    { k: "Volume",     v: fmtCompact(summary.volume) },
    { k: "52w High",   v: "$" + fmtPrice(summary.high52) },
    { k: "52w Low",    v: "$" + fmtPrice(summary.low52) },
    { k: "Day",        v: fmtPct(summary.dayChangePct), pct: true },
    { k: "Week",       v: fmtPct(summary.wkChangePct),  pct: true },
    { k: "Month",      v: fmtPct(summary.moChangePct),  pct: true },
    { k: "Year",       v: fmtPct(summary.yrChangePct),  pct: true },
    { k: "PEG",        v: summary.peg.toFixed(2) },
    { k: "Sector",     v: summary.sector },
  ];
  return (
    <div className="ti-kpi-strip">
      {items.map(it => {
        let cls = "";
        if (it.pct) { const n = parseFloat(it.v); cls = n > 0 ? "ti-pos" : n < 0 ? "ti-neg" : ""; }
        return (
          <div className="ti-kpi" key={it.k}>
            <div className="ti-kpi-k">{it.k}</div>
            <div className={`ti-kpi-v ${cls}`}>{it.v}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── PriceChart ────────────────────────────────────────────────
function PriceChart({ quotes, events, period, style = "area", overlays }) {
  const [hover, setHover] = useState(null);
  const ref = useRef(null);
  const [box, setBox] = useState({ w: 900, h: 360 });

  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(es => {
      const cr = es[0].contentRect;
      setBox({ w: cr.width || 900, h: cr.height || 360 });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  const slice = useMemo(() => {
    const days = period === "5D" ? 5 : period === "1M" ? 22 : period === "3M" ? 66 : period === "6M" ? 132 : period === "YTD" ? 88 : period === "1Y" ? 252 : 540;
    return quotes.slice(-days);
  }, [quotes, period]);

  const maData = useMemo(() => {
    if (!overlays?.ma) return null;
    const calc = (n) => quotes.map((_, i) => {
      if (i < n - 1) return null;
      const avg = quotes.slice(i - n + 1, i + 1).reduce((s, q) => s + q.close, 0) / n;
      return avg;
    });
    const ma20 = calc(20);
    const ma50 = calc(50);
    const sliceStart = quotes.length - slice.length;
    return { ma20: ma20.slice(sliceStart), ma50: ma50.slice(sliceStart) };
  }, [quotes, slice.length, overlays?.ma]);

  const PAD = { l: 56, r: 12, t: 12, b: 26 };
  const W = box.w, H = box.h;
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;

  const lo = Math.min(...slice.map(q => q.low));
  const hi = Math.max(...slice.map(q => q.high));
  const pad = (hi - lo) * 0.08;
  const yMin = lo - pad, yMax = hi + pad;
  const yScale = v => PAD.t + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
  const xScale = i => PAD.l + (i / Math.max(1, slice.length - 1)) * innerW;

  const linePath = slice.map((q, i) => `${i === 0 ? "M" : "L"} ${xScale(i)} ${yScale(q.close)}`).join(" ");
  const areaPath = `${linePath} L ${xScale(slice.length - 1)} ${PAD.t + innerH} L ${PAD.l} ${PAD.t + innerH} Z`;

  const yTicks = 5;
  const yLabels = Array.from({ length: yTicks }, (_, i) => yMin + (i / (yTicks - 1)) * (yMax - yMin));
  const xTickCount = Math.min(6, slice.length);
  const xTicks = Array.from({ length: xTickCount }, (_, i) => Math.floor((i / (xTickCount - 1)) * (slice.length - 1)));

  const trendUp = slice[slice.length - 1]?.close >= slice[0]?.close;
  const lineColor = trendUp ? "var(--ti-up)" : "var(--ti-down)";

  const sliceT0 = slice[0]?.t, sliceTN = slice[slice.length - 1]?.t;
  const visibleEvents = (events || []).filter(e => e.t >= sliceT0 && e.t <= sliceTN);

  function onMove(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < PAD.l || x > PAD.l + innerW) { setHover(null); return; }
    const idx = Math.round(((x - PAD.l) / innerW) * (slice.length - 1));
    const q = slice[idx];
    if (!q) return;
    setHover({ idx, q, x: xScale(idx), y: yScale(q.close) });
  }

  const maPath = (vals) => vals.map((v, i) => v == null ? "" : `${i === 0 || vals[i-1] == null ? "M" : "L"} ${xScale(i)} ${yScale(v)}`).join(" ");

  return (
    <div className="ti-chart-wrap" ref={ref}>
      <svg
        className="ti-chart-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="ti-area-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={lineColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
          </linearGradient>
        </defs>

        {yLabels.map((v, i) => (
          <g key={i}>
            <line x1={PAD.l} x2={W - PAD.r} y1={yScale(v)} y2={yScale(v)}
              stroke="var(--ti-line)" strokeWidth="0.5"
              strokeDasharray={i === 0 || i === yLabels.length - 1 ? "0" : "2 4"} />
            <text x={PAD.l - 8} y={yScale(v) + 4} textAnchor="end" className="ti-y-label">{v.toFixed(0)}</text>
          </g>
        ))}

        {xTicks.map((i, k) => (
          <text key={k} x={xScale(i)} y={H - 8} textAnchor="middle" className="ti-x-label">{fmtDateShort(slice[i]?.t)}</text>
        ))}

        {style === "candle" ? (
          slice.map((q, i) => {
            const cw = Math.max(1, innerW / slice.length * 0.7);
            const x = xScale(i);
            const up = q.close >= q.open;
            return (
              <g key={i}>
                <line x1={x} x2={x} y1={yScale(q.high)} y2={yScale(q.low)} stroke={up ? "var(--ti-up)" : "var(--ti-down)"} strokeWidth="1" />
                <rect x={x - cw / 2} y={yScale(Math.max(q.open, q.close))} width={cw}
                  height={Math.max(1, Math.abs(yScale(q.open) - yScale(q.close)))}
                  fill={up ? "var(--ti-up)" : "var(--ti-down)"} />
              </g>
            );
          })
        ) : style === "line" ? (
          <path d={linePath} fill="none" stroke={lineColor} strokeWidth="1.6" />
        ) : (
          <>
            <path d={areaPath} fill="url(#ti-area-grad)" />
            <path d={linePath} fill="none" stroke={lineColor} strokeWidth="1.6" />
          </>
        )}

        {maData && (
          <>
            <path d={maPath(maData.ma20)} fill="none" stroke="var(--color-amber)" strokeWidth="1" opacity="0.7" strokeDasharray="0" />
            <path d={maPath(maData.ma50)} fill="none" stroke="#8b5cf6" strokeWidth="1" opacity="0.7" />
          </>
        )}

        {overlays?.events && visibleEvents.map(ev => {
          const idx = slice.findIndex(q => q.t >= ev.t);
          if (idx < 0) return null;
          const x = xScale(idx);
          const color = ev.sev === "pos" ? "var(--ti-up)" : ev.sev === "neg" ? "var(--ti-down)" : ev.sev === "critical" ? "#f97316" : "var(--ti-accent)";
          return (
            <g key={ev.id}>
              <line x1={x} x2={x} y1={PAD.t} y2={PAD.t + innerH} stroke={color} strokeWidth="1" strokeDasharray="2 3" opacity="0.5" />
              <circle cx={x} cy={PAD.t + 8} r="4" fill={color}><title>{ev.kind.toUpperCase()} · {ev.title}</title></circle>
            </g>
          );
        })}

        {hover && (
          <g pointerEvents="none">
            <line x1={hover.x} x2={hover.x} y1={PAD.t} y2={PAD.t + innerH} stroke="var(--ti-faint)" strokeWidth="0.5" strokeDasharray="2 2" />
            <line x1={PAD.l} x2={W - PAD.r} y1={hover.y} y2={hover.y} stroke="var(--ti-faint)" strokeWidth="0.5" strokeDasharray="2 2" />
            <circle cx={hover.x} cy={hover.y} r="4" fill={lineColor} stroke="var(--ti-bg1)" strokeWidth="2" />
          </g>
        )}
      </svg>

      {hover && (
        <div className="ti-tooltip" style={{ left: Math.min(hover.x + 12, W - 160), top: Math.max(8, hover.y - 60) }}>
          <div className="ti-tt-date">{fmtDateShort(hover.q.t)}</div>
          <div className="ti-tt-row"><span>O</span><b>{fmtPrice(hover.q.open)}</b></div>
          <div className="ti-tt-row"><span>H</span><b>{fmtPrice(hover.q.high)}</b></div>
          <div className="ti-tt-row"><span>L</span><b>{fmtPrice(hover.q.low)}</b></div>
          <div className="ti-tt-row"><span>C</span><b className={hover.q.close >= hover.q.open ? "ti-pos" : "ti-neg"}>{fmtPrice(hover.q.close)}</b></div>
          <div className="ti-tt-row"><span>Vol</span><b>{fmtCompact(hover.q.volume)}</b></div>
        </div>
      )}
    </div>
  );
}

// ── VolumeStrip ───────────────────────────────────────────────
function VolumeStrip({ quotes, period }) {
  const days = period === "5D" ? 5 : period === "1M" ? 22 : period === "3M" ? 66 : period === "6M" ? 132 : period === "YTD" ? 88 : period === "1Y" ? 252 : 540;
  const slice = quotes.slice(-days);
  const max = Math.max(...slice.map(q => q.volume));
  return (
    <svg viewBox={`0 0 ${slice.length} 32`} preserveAspectRatio="none" width="100%" height="32">
      {slice.map((q, i) => {
        const h = (q.volume / max) * 30;
        const up = q.close >= q.open;
        return <rect key={i} x={i + 0.1} y={32 - h} width={0.8} height={h} fill={up ? "var(--ti-up)" : "var(--ti-down)"} opacity="0.55" />;
      })}
    </svg>
  );
}

// ── SentimentTimeline ─────────────────────────────────────────
function SentimentTimeline({ news }) {
  const ref = useRef(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(es => setW(es[0].contentRect.width || 600));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  if (!news.length) return null;
  const t0 = Math.min(...news.map(n => n.t));
  const t1 = Math.max(...news.map(n => n.t));
  const H = 84;
  return (
    <div ref={ref} style={{ marginBottom: 14 }}>
      <svg viewBox={`0 0 ${w} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        <line x1="0" x2={w} y1={H / 2} y2={H / 2} stroke="var(--ti-line)" strokeWidth="0.5" />
        {news.map(n => {
          const x = ((n.t - t0) / Math.max(1, t1 - t0)) * (w - 16) + 8;
          const y = H / 2 - n.sentiment * (H / 2 - 6);
          const r = 3 + Math.abs(n.sentiment) * 3;
          const c = n.sentiment > 0.05 ? "var(--ti-up)" : n.sentiment < -0.05 ? "var(--ti-down)" : "var(--ti-faint)";
          return (
            <g key={n.id}>
              <line x1={x} x2={x} y1={H / 2} y2={y} stroke={c} strokeWidth="1" opacity="0.4" />
              <circle cx={x} cy={y} r={r} fill={c} opacity="0.85">
                <title>{fmtDateShort(n.t)} · {n.title}</title>
              </circle>
            </g>
          );
        })}
      </svg>
      <div className="ti-sent-axis">
        <span>{fmtDateShort(t0)}</span>
        <span>+1.0</span>
        <span>−1.0</span>
        <span>{fmtDateShort(t1)}</span>
      </div>
    </div>
  );
}

// ── ChartToolbar ──────────────────────────────────────────────
function ChartToolbar({ period, setPeriod, style, setStyle, overlays, setOverlays }) {
  const periods = ["5D", "1M", "3M", "6M", "YTD", "1Y", "ALL"];
  const styles  = [{ id: "area", label: "Area" }, { id: "line", label: "Line" }, { id: "candle", label: "Candle" }];
  const ovlDefs = [{ id: "events", label: "Events" }, { id: "volume", label: "Volume" }, { id: "ma", label: "MA 20/50" }];
  return (
    <div className="ti-ch-toolbar">
      <div className="ti-seg">
        {periods.map(p => (
          <button key={p} className={`ti-seg-btn${period === p ? " is-active" : ""}`} onClick={() => setPeriod(p)}>{p}</button>
        ))}
      </div>
      <div className="ti-ch-tools-right">
        <div className="ti-seg ti-seg-sm">
          {styles.map(s => (
            <button key={s.id} className={`ti-seg-btn${style === s.id ? " is-active" : ""}`} onClick={() => setStyle(s.id)}>{s.label}</button>
          ))}
        </div>
        <div className="ti-ovl-row">
          {ovlDefs.map(o => (
            <label key={o.id} className={`ti-ovl-chip${overlays[o.id] ? " is-on" : ""}`}>
              <input type="checkbox" checked={!!overlays[o.id]} onChange={e => setOverlays({ ...overlays, [o.id]: e.target.checked })} />
              <span className="ti-ovl-dot" />
              {o.label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── EventsLane ────────────────────────────────────────────────
function EventsLane({ events, period }) {
  if (!events?.length) return null;
  const days = period === "5D" ? 5 : period === "1M" ? 22 : period === "3M" ? 66 : period === "6M" ? 132 : period === "YTD" ? 88 : period === "1Y" ? 252 : 540;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const visible = events.filter(e => e.t >= cutoff);
  if (!visible.length) return null;
  return (
    <div className="ti-ev-lane">
      <div className="ti-ev-lane-title">Events on chart</div>
      <div className="ti-ev-row">
        {visible.map(e => {
          const cls = e.sev === "pos" ? "pos" : e.sev === "neg" ? "neg" : e.sev === "critical" ? "crit" : "";
          return (
            <div key={e.id} className={`ti-ev-pill ${cls}`}>
              <span className="ti-ev-kind">{e.kind.toUpperCase()}</span>
              <span>{e.title}</span>
              <span className="ti-ev-date">{fmtDateShort(e.t)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── NewsList ──────────────────────────────────────────────────
function NewsList({ news }) {
  return (
    <div className="ti-news-list">
      {news.map(n => {
        const pos = n.sentiment > 0.05;
        const neg = n.sentiment < -0.05;
        const cls = pos ? "pos" : neg ? "neg" : "neu";
        return (
          <article key={n.id} className="ti-news-item">
            <div className={`ti-news-bar ${cls}`} />
            <div>
              <div className="ti-news-meta">
                <span className="ti-news-pub">{n.publisher}</span>
                <span className="ti-faint">·</span>
                <span className="ti-faint" style={{ fontFamily: "var(--mono)", fontSize: 10 }}>{fmtDateShort(n.t)}</span>
                <span className="ti-faint">·</span>
                <span className="ti-news-tag">{n.tag}</span>
              </div>
              <div className="ti-news-title">{n.title}</div>
              <div className="ti-news-sent">
                <SentMeter v={n.sentiment} />
                <span className={`ti-mono-sm ${pos ? "ti-pos" : neg ? "ti-neg" : "ti-faint"}`}>
                  {(n.sentiment > 0 ? "+" : "") + n.sentiment.toFixed(2)}
                </span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

// ── SignalsCard ───────────────────────────────────────────────
function SignalsCard() {
  return (
    <div className="ti-sig-list">
      {SIGNALS.map(s => (
        <div key={s.id} className="ti-sig-row">
          <div className="ti-sig-label">{s.label}</div>
          <div className="ti-sig-bar-wrap">
            <div className="ti-sig-bar" style={{ width: `${Math.min(100, s.count * 1.4)}%` }} />
          </div>
          <div className={`ti-sig-delta ${s.dir}`}>
            {s.dir === "up" ? "↗" : s.dir === "down" ? "↘" : "→"} {s.count}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── CorrMatrix ────────────────────────────────────────────────
function CorrMatrix({ selected }) {
  const tickers = TICKERS.slice(0, 7).map(t => t.ticker);
  const corrs = useMemo(() => {
    const m = {};
    tickers.forEach(a => {
      m[a] = {};
      tickers.forEach(b => {
        if (a === b) { m[a][b] = 1; return; }
        const ra = QUOTES[a].slice(-90);
        const rb = QUOTES[b].slice(-90);
        const da = ra.slice(1).map((q, i) => Math.log(q.close / ra[i].close));
        const db = rb.slice(1).map((q, i) => Math.log(q.close / rb[i].close));
        const ma = da.reduce((s, v) => s + v, 0) / da.length;
        const mb = db.reduce((s, v) => s + v, 0) / db.length;
        let num = 0, va = 0, vb = 0;
        for (let i = 0; i < da.length; i++) { num += (da[i]-ma)*(db[i]-mb); va += (da[i]-ma)**2; vb += (db[i]-mb)**2; }
        m[a][b] = num / Math.sqrt(va * vb);
      });
    });
    return m;
  }, []);

  return (
    <div className="ti-corr">
      <div className="ti-corr-row ti-corr-head">
        <div className="ti-corr-cell" />
        {tickers.map(t => <div key={t} className="ti-corr-cell">{t}</div>)}
      </div>
      {tickers.map(a => (
        <div key={a} className="ti-corr-row">
          <div className="ti-corr-cell ti-corr-lbl">{a}</div>
          {tickers.map(b => {
            const v = corrs[a][b];
            const isSel = a === selected || b === selected;
            const intensity = Math.abs(v);
            const color = a === b ? "transparent" : v > 0 ? `oklch(0.45 ${0.13 * intensity} 150)` : `oklch(0.45 ${0.13 * intensity} 25)`;
            return (
              <div key={b} className={`ti-corr-cell${isSel ? " ti-corr-sel" : ""}`}
                style={{ background: color, color: a === b ? "var(--ti-faint)" : "white" }}>
                {v.toFixed(2)}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── EntityPanel ───────────────────────────────────────────────
function EntityPanel() {
  return (
    <div className="ti-ent-grid">
      {ENTITIES.map(e => {
        const cls = e.sentiment > 0.1 ? "pos" : e.sentiment < -0.1 ? "neg" : "";
        return (
          <div key={e.id} className="ti-ent-card">
            <div className="ti-ent-head">
              <div className="ti-ent-name">{e.name}</div>
              <div className={`ti-ent-pill ${cls}`}>{e.role}</div>
            </div>
            <div className="ti-ent-stats">
              <div><div className="ti-ent-stat-v">{e.articles}</div><div className="ti-ent-stat-k">articles</div></div>
              <div><div className="ti-ent-stat-v">{e.mentions}</div><div className="ti-ent-stat-k">mentions</div></div>
            </div>
            <div className="ti-ent-sent-row">
              <SentMeter v={e.sentiment} />
              <span className={`ti-mono-sm ${cls === "pos" ? "ti-pos" : cls === "neg" ? "ti-neg" : "ti-faint"}`} style={{ fontFamily: "var(--mono)", fontSize: 11, minWidth: 38, textAlign: "right" }}>
                {(e.sentiment > 0 ? "+" : "") + e.sentiment.toFixed(2)}
              </span>
            </div>
            <div className="ti-ent-tags">{e.tags.map(t => <span key={t} className="ti-ent-tag">{t}</span>)}</div>
          </div>
        );
      })}
    </div>
  );
}

// ── NarrativeCard ─────────────────────────────────────────────
function NarrativeCard({ summary, news, events }) {
  const pos = news.filter(n => n.sentiment > 0.05).length;
  const neg = news.filter(n => n.sentiment < -0.05).length;
  const top = news[0];
  const pct = summary.dayChangePct;
  const direction = pct > 1 ? "pushing higher" : pct > 0 ? "edging up" : pct > -1 ? "softening" : "under pressure";
  const tone = pos > neg + 1 ? "tilted bullish" : neg > pos + 1 ? "tilted bearish" : "mixed";
  return (
    <div className="ti-narrative">
      <p>
        <b>{summary.ticker}</b> is <b className={pct >= 0 ? "ti-pos" : "ti-neg"}>{direction}</b> at{" "}
        <b style={{ fontFamily: "var(--mono)" }}>${fmtPrice(summary.price)}</b> ({fmtPct(pct)}). Coverage this week is{" "}
        <b>{tone}</b> — {pos} bullish, {neg} bearish across {news.length} articles.
        {top && <> Top headline: <i>"{top.title}"</i>.</>}
      </p>
      <p>
        Tracking <b style={{ fontFamily: "var(--mono)" }}>{events.length}</b> on-chart events including{" "}
        {events.slice(0, 3).map((e, i) => (
          <span key={e.id}>{i > 0 ? ", " : ""}
            <span className={`ti-ntag ${e.sev === "pos" ? "pos" : e.sev === "neg" ? "neg" : ""}`}>{e.title}</span>
          </span>
        ))}. Year-to-date the name is{" "}
        <b className={summary.yrChangePct >= 0 ? "ti-pos" : "ti-neg"}>{fmtPct(summary.yrChangePct)}</b>, sitting{" "}
        {(summary.posInRange * 100).toFixed(0)}% through its 52-week range.
      </p>
      <div className="ti-cta">
        <button className="ti-btn">Generate full report</button>
        <button className="ti-btn ti-btn-ghost">Add to thesis</button>
        <button className="ti-btn ti-btn-ghost">Export PDF</button>
      </div>
    </div>
  );
}

// ── AIChatPane ────────────────────────────────────────────────
function AIChatPane({ open, setOpen, ticker }) {
  const [messages, setMessages] = useState([
    { role: "assistant", text: `I'm watching ${ticker}. Ask about price action, news, correlations, or run a what-if.` },
  ]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    setMessages([{ role: "assistant", text: `I'm watching ${ticker}. Ask about price action, news, correlations, or run a what-if.` }]);
  }, [ticker]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, busy]);

  function send(text) {
    if (!text.trim()) return;
    setMessages(m => [...m, { role: "user", text }]);
    setDraft("");
    setBusy(true);
    setTimeout(() => {
      const preset = CHAT_PRESETS.find(p => p.q.toLowerCase() === text.toLowerCase());
      const reply = preset?.a ?? `Looking at ${ticker} now. Recent sentiment is mixed; the chart's holding the 50-day. I'd flag the upcoming print as the biggest near-term variance source.`;
      setMessages(m => [...m, { role: "assistant", text: reply }]);
      setBusy(false);
    }, 700 + Math.random() * 600);
  }

  if (!open) {
    return (
      <button className="ti-chat-fab" onClick={() => setOpen(true)}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        Ask Lens
      </button>
    );
  }

  return (
    <aside className="ti-chat-pane">
      <div className="ti-chat-head">
        <div className="ti-chat-title">
          <svg width="14" height="14" viewBox="0 0 24 24"><path d="M12 2 14 9 21 12 14 15 12 22 10 15 3 12 10 9Z" fill="var(--ti-accent)" /></svg>
          Lens AI
          <span className="ti-muted" style={{ fontSize: 12, fontWeight: 400 }}>· {ticker}</span>
        </div>
        <button className="ti-chat-close" onClick={() => setOpen(false)} aria-label="close">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M6 6 18 18M18 6 6 18" />
          </svg>
        </button>
      </div>
      <div className="ti-chat-scroll" ref={scrollRef}>
        {messages.map((m, i) => (
          <div key={i} className={`ti-msg${m.role === "user" ? " ti-msg-user" : ""}`}>
            {m.role === "assistant" && (
              <div className="ti-msg-avatar">
                <svg width="10" height="10" viewBox="0 0 24 24"><path d="M12 2 14 9 21 12 14 15 12 22 10 15 3 12 10 9Z" fill="var(--ti-accent)" /></svg>
              </div>
            )}
            <div className="ti-bubble">{m.text}</div>
          </div>
        ))}
        {busy && (
          <div className="ti-msg">
            <div className="ti-msg-avatar">
              <svg width="10" height="10" viewBox="0 0 24 24"><path d="M12 2 14 9 21 12 14 15 12 22 10 15 3 12 10 9Z" fill="var(--ti-accent)" /></svg>
            </div>
            <div className="ti-bubble ti-typing"><span /><span /><span /></div>
          </div>
        )}
      </div>
      <div className="ti-chat-presets">
        {CHAT_PRESETS.map(p => (
          <button key={p.q} className="ti-preset" onClick={() => send(p.q)}>{p.q}</button>
        ))}
      </div>
      <form className="ti-chat-form" onSubmit={e => { e.preventDefault(); send(draft); }}>
        <input
          className="ti-chat-input"
          placeholder={`Ask Lens about ${ticker}…`}
          value={draft}
          onChange={e => setDraft(e.target.value)}
        />
        <button type="submit" className="ti-chat-send" aria-label="send">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 2 11 13M22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </aside>
  );
}

// ── TICard ────────────────────────────────────────────────────
function TICard({ title, action, children }) {
  return (
    <section className="ti-card">
      <div className="ti-card-head">
        <div className="ti-card-title">{title}</div>
        {action}
      </div>
      <div className="ti-card-body">{children}</div>
    </section>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function TradingIntelligence() {
  const [selected, setSelected]   = useState("NVDA");
  const [period, setPeriod]       = useState("6M");
  const [chartStyle, setStyle]    = useState("area");
  const [overlays, setOverlays]   = useState({ events: true, volume: false, ma: false });
  const [chatOpen, setChatOpen]   = useState(false);

  const summary = useMemo(() => summarize(selected), [selected]);
  const news    = useMemo(() => newsFor(selected),    [selected]);
  const events  = useMemo(() => eventsFor(selected),  [selected]);

  return (
    <div className="ti-root">
      <div className={`ti-shell${chatOpen ? " ti-chat-open" : ""}`}>
        <WatchlistSidebar selected={selected} onSelect={setSelected} />

        <main className="ti-main">
          <TickerHeader summary={summary} />
          <KPIStrip summary={summary} />

          <TICard
            title="Price"
            action={
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="ti-muted" style={{ fontSize: 12, fontFamily: "var(--mono)" }}>{period}</span>
                <button className="ti-link-btn" onClick={() => setChatOpen(true)}>Ask AI →</button>
              </div>
            }
          >
            <ChartToolbar period={period} setPeriod={setPeriod} style={chartStyle} setStyle={setStyle} overlays={overlays} setOverlays={setOverlays} />
            <PriceChart quotes={QUOTES[selected]} events={events} period={period} style={chartStyle} overlays={overlays} />
            {overlays.volume && (
              <div className="ti-vol-wrap">
                <div className="ti-vol-label">Volume</div>
                <VolumeStrip quotes={QUOTES[selected]} period={period} />
              </div>
            )}
            <EventsLane events={events} period={period} />
          </TICard>

          <div className="ti-grid-2">
            <TICard
              title={`News & sentiment · ${news.length}`}
              action={
                <div className="ti-seg ti-seg-sm" style={{ "--ti-r-sm": "4px" }}>
                  <button className="ti-seg-btn is-active">All</button>
                  <button className="ti-seg-btn">Bullish</button>
                  <button className="ti-seg-btn">Bearish</button>
                </div>
              }
            >
              <SentimentTimeline news={news} />
              <NewsList news={news.slice(0, 5)} />
            </TICard>

            <div className="ti-stack">
              <TICard title="Macro signals" action={<span className="ti-faint" style={{ fontSize: 12 }}>past 7 days</span>}>
                <SignalsCard />
              </TICard>
              <TICard title="Correlation matrix" action={<span className="ti-faint" style={{ fontSize: 12 }}>90d · close-to-close</span>}>
                <CorrMatrix selected={selected} />
              </TICard>
            </div>
          </div>

          <TICard title="Entity intelligence" action={<span className="ti-faint" style={{ fontSize: 12 }}>Co-mentioned in {selected} coverage</span>}>
            <EntityPanel />
          </TICard>

          <TICard title="Lens narrative" action={<span className="ti-faint" style={{ fontSize: 12 }}>Auto-generated · 2 min ago</span>}>
            <NarrativeCard summary={summary} news={news} events={events} />
          </TICard>
        </main>

        <AIChatPane open={chatOpen} setOpen={setChatOpen} ticker={selected} />
      </div>
    </div>
  );
}
