# Research & Planning Page

Internal tool for planning, reference material, and signal expansion notes. Not user-facing — accessible only to the developer/analyst.

## Purpose

The Research section is an internal knowledge base embedded in the app. It holds:

- **Plans** (`tag: planned`) — features not yet built, with architecture and signal rationale
- **Reference** (`tag: reference`) — domain knowledge for expanding the data pipeline; read-only notes

It exists in the app rather than in docs because the content is interlinked with the live app (links to routes, references to active pipeline forms, API endpoints in use).

---

## Routes

| Route | Component | Tag | Purpose |
|---|---|---|---|
| `/research` | `Research/index.tsx` | — | Index grid of all cards |
| `/research/insider-intel` | `InsiderIntel/index.tsx` | planned | Form 3/4/5 tracking, Neo4j graph, person-level insider trades |
| `/research/edgar-uses` | `Research/EdgarUses.tsx` | reference | EDGAR form types worth adding to pipeline |
| `/research/edgar-deeper` | `Research/EdgarDeeper.tsx` | reference | Higher-effort EDGAR signals (breach, CORRESP, 13F, derivatives) |
| `/research/edgar-entities` | `Research/EdgarEntities.tsx` | reference | Non-person, non-company entity types for the graph |
| `/research/gov-contracts` | `Research/GovContracts.tsx` | reference | Federal contract ecosystem (SAM.gov, FedRAMP, SBIR, IDIQ) |
| `/research/usa-spending` | `Research/UsaSpending.tsx` | reference | USASpending.gov API details, signal patterns, UEI mapping |

---

## Index page (`Research/index.tsx`)

Renders a `PLANS` array as a card grid. Each card is a React Router `<Link>`. Tags drive color via `TAG_COLORS`:

- `planned` → `var(--color-blue)` — not yet built
- `reference` → `var(--primary)` — domain notes only
- `active` → `#4ade80` — live feature (none currently)

Adding a new card: append an object to `PLANS`. No other changes needed.

---

## Sub-pages — coding conventions

All sub-pages follow the same structure:

```tsx
<Page title="...">
  <Link to="/research" className="research-back">← Research & Strategy</Link>
  <div className="insider-sections">
    <section className="insider-section insider-section--note"> {/* intro/highlight */}
    <section className="insider-section"> {/* standard section */}
    <section className="insider-section insider-section--reminder"> {/* priority/action list */}
  </div>
</Page>
```

CSS classes come from two files:
- `Research/Research.css` — card grid and back-link styles (index only)
- `InsiderIntel/InsiderIntel.css` — section layout used by all sub-pages

Sub-pages import `../InsiderIntel/InsiderIntel.css` directly. Do not duplicate these styles.

### Section modifiers

| Class | Visual purpose |
|---|---|
| `insider-section--note` | Highlighted intro or key context block |
| `insider-section--reminder` | Priority action list at bottom of page |
| (none) | Standard content section |

---

## Content per sub-page

### EdgarUses — SEC EDGAR Beyond the Basics

What the pipeline already downloads vs what to add next. Covers:

- **Already in pipeline**: 10-K, 10-Q, 8-K, DEF 14A, SC 13G/D
- **Add to pipeline**: Form 3/4/5 (insider filings), 425 (M&A signal), SC 13D/A, NT 10-K/Q (distress), S-3 (capital raise)
- **M&A signals**: 425, SC TO-T, DEFM14A, S-4
- **Distress signals**: NT 10-K, 8-K Item 4.01/4.02, 15-12G
- **Priority additions**: Form 3/4/5, 425, SC 13D, NT 10-K/Q, S-3

### EdgarDeeper — Higher-Effort Signals

Advanced EDGAR parsing, higher effort but strong signal:

- **8-K Item 1.05** — breach disclosure (2023 SEC rule). Already download 8-K; parse item number only. Highest priority
- **CORRESP** — SEC comment letters. Reveals what management was trying to obscure
- **DEF 14A parsing** — say-on-pay votes, option grant timing, board skill matrix
- **Form 144** — 2-day early warning before insider sale (vs Form 4 which is after)
- **Form 4 derivative table** — option exercise + hold = high conviction signal; already in XML
- **SC 13F** — institutional fund flows quarterly; 45-day lag, filter to covered tickers
- **Debt/dilution signals**: 424B2/B3, 8-K Item 2.04, Form 8-A

### EdgarEntities — Entity Types for the Graph

Non-company, non-person nodes to add to the Neo4j relationship graph:

- **Counterparties** — extract from 8-K Item 1.01 body text. Highest priority gap
- **Law firms** — signal transaction type (Wachtell = large M&A, Wilson Sonsini = tech)
- **Auditors** — Big Four switch direction is a signal; 8-K 4.01/4.02 for auditor events
- **Investment banks** — underwriter list signals deal quality; Qatalyst = tech M&A confirmed
- **Regulators** — CFIUS blocks, CISA KEV additions, Wells Notices (8-K), withdrawn HSR filings
- **Certification bodies** — FedRAMP marketplace API (`marketplace.fedramp.gov/api/products`), Common Criteria, FIPS 140

### GovContracts — Government Contract Ecosystem

Federal contract data sources for cybersecurity revenue signals:

- **USASpending.gov** — every federal award, free REST API, no auth, updated daily
- **SAM.gov** — registration status = federal intent signal; Cage code for precise USASpending queries
- **FedRAMP** — cloud auth unlocks full federal sales channel; poll weekly, diff for new authorizations
- **SBIR/STTR** — Phase II DARPA/DHS/NSA grants = capability validation 2–4 years pre-product
- **IDIQ vehicles** — CIO-SP4, SEWP V, Alliant 2; on/off status is a recurring revenue signal
- **Alert thresholds**: new award >$10M from DHS/DoD/IC, award description mentions competitor, FedRAMP High authorization

### UsaSpending — API Reference

Detailed API documentation for USASpending.gov:

- **Key endpoints**:
  - Award search: `POST /api/v2/search/spending_by_award/`
  - Recipient profile by UEI: `GET /api/v2/recipient/uei/{uei}/`
  - Agency awards: `GET /api/v2/agency/{toptier_code}/awards/`
  - Award detail: `GET /api/v2/awards/{award_id}/`
  - Recipient autocomplete: `POST /api/v2/autocomplete/recipient/`
- **UEI vs name**: always use UEI (replaced DUNS in 2022); resolve once via SAM.gov and store
- **Signal patterns**: new >$10M award, replacement contract (competitor named in description), renewal window, defense prime subcontract, cluster of small awards
- **High-value agencies**: CISA, DISA, NSA, USCYBERCOM, FBI Cyber, State/Diplomatic Security, Treasury/FinCEN
- **Rate limit**: no documented limit, stay under 10 req/sec

---

## Adding a new research page

1. Create `frontend/src/pages/Research/MyPage.tsx` following the section structure above
2. Import `../InsiderIntel/InsiderIntel.css`
3. Add a card object to the `PLANS` array in `Research/index.tsx`
4. Add the route in the app router

No backend involvement. These pages are static content only.

---

## Relationship to live features

The Research index links to `/research/insider-intel` which is a `planned` feature backed by `frontend/src/pages/InsiderIntel/`. That page is partially scaffolded — it describes the architecture for Form 3/4/5 ingestion and a Neo4j person graph, but the backend pipeline does not yet exist.

The `features/sec/` feature module (`SecDownloadForm`, `SecTimeline`, `SecFileList`, etc.) is the live SEC Archive implementation — separate from the Research planning pages.
