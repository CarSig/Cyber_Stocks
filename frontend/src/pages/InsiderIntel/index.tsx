import { Link } from 'react-router-dom';
import Page from '@/components/common/Page';
import './InsiderIntel.css';

export default function InsiderIntel() {
  return (
    <Page title="Insider Intel — Notes & Plan">
      <Link to="/research" className="research-back">
        ← Research & Strategy
      </Link>

      <div className="insider-sections">
        <section className="insider-section insider-section--note">
          <h2 className="insider-section-title">Universe size — who counts</h2>
          <p>
            SEC insiders = officers (CEO/CFO/CTO/CISO/GC/VP+), directors (board members), anyone owning &gt;10% of
            shares.
          </p>
          <p>
            Typical company: 8–15 board members + 10–20 named officers = <strong>20–35 people</strong>. Across ~20
            cybersecurity companies: 400–700 total, with overlap down to <strong>300–500 unique individuals</strong>.
            The same VC partners (Sequoia, a16z, KP) and ex-executives rotate across many of these boards. A stable core
            of maybe 200 people file regularly. Very trackable.
          </p>
          <p>
            Every Form 4 includes a CIK for the <em>reporting person</em> — not just the company. That CIK is permanent
            and never changes across companies or roles. Follow the person, not the company.
          </p>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Form 3 — new insider = directional signal</h2>
          <p>
            Form 3 fires when someone first becomes an insider. Must be filed within 10 days.
            <strong> Often hits EDGAR before the press release.</strong> This is the earliest public signal of a
            strategic change — before any 8-K, before Bloomberg, before LinkedIn.
          </p>
          <p>Who joins predicts where the company is going, 6–18 months out:</p>
          <ul className="insider-list">
            <li>
              <strong>Ex-NSA / CISA / GCHQ</strong> → federal contracts, compliance products, or incoming regulatory
              scrutiny
            </li>
            <li>
              <strong>Unit 8200 alumni</strong> → plugging into the Israeli intelligence network (CrowdStrike, Palo
              Alto, Check Point, Wiz, Claroty all heavy here)
            </li>
            <li>
              <strong>Ex-AWS / Azure / GCP exec</strong> → cloud pivot or major infrastructure partnership in
              negotiation
            </li>
            <li>
              <strong>M&amp;A specialist / investment banker</strong> → acquisition or being acquired, typically within
              12–18 months
            </li>
            <li>
              <strong>Ex-competitor exec</strong> → source company weakening, or hiring company wants specific
              relationships / IP
            </li>
            <li>
              <strong>CISO from bank or healthcare</strong> → that vertical about to become primary sales focus
            </li>
            <li>
              <strong>Academic / researcher</strong> → new product category, R&amp;D push
            </li>
            <li>
              <strong>Serial VC-connected board member</strong> → funding round or exit prep
            </li>
            <li>
              <strong>2–3 join simultaneously (cluster)</strong> → almost always precedes a major strategic shift or
              pre-IPO cleanup
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Form 4 — transaction signals</h2>
          <ul className="insider-list">
            <li>
              <strong>Open-market buy</strong> (code P, not option grant) → strongest conviction signal, insider
              spending real money
            </li>
            <li>
              <strong>Cluster buying</strong> across multiple insiders same week → very high signal
            </li>
            <li>
              <strong>Insider joins and immediately buys open-market</strong> → much stronger than any option grant
            </li>
            <li>
              <strong>Selling after lock-up</strong> → noise, expected, ignore
            </li>
            <li>
              <strong>Selling before an earnings miss</strong> → worth back-testing: did they know?
            </li>
            <li>
              <strong>Same person selling across multiple portfolio companies simultaneously</strong> → macro signal,
              not company-specific
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Cross-company patterns</h2>
          <ul className="insider-list">
            <li>
              Same person on boards of two competitors → watch for conflict of interest filing, but also watch the
              window before it
            </li>
            <li>Person leaves company A and joins company B → company A may be weakening, B accelerating</li>
            <li>Back-test: Form 3 filing date → days until next material 8-K → what was the event type?</li>
            <li>
              Background category → event type correlation matrix (ex-govt hire → govt contract 8-K? M&amp;A hire →
              merger filing?)
            </li>
            <li>
              Unit 8200 network: CrowdStrike, Palo Alto, Check Point, Wiz, Claroty, Cato Networks, Cymulate, Deep
              Instinct — new join signals network activation
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Analytical pipeline to build</h2>
          <ul className="insider-list">
            <li>Download all Form 3s for covered companies — these fire the moment someone becomes an insider</li>
            <li>
              Enrich each person with prior roles (LinkedIn / Crunchbase) — categorize: government, cloud, finance,
              competitor, academic
            </li>
            <li>Track time-to-event: days from Form 3 filing date until next 8-K material announcement</li>
            <li>Build a background → announcement-type correlation matrix</li>
            <li>
              Add Form 4 open-market buys (code P) — cluster detection: 3+ insiders buying same company within 5 days
            </li>
            <li>Cross-company selling: same person liquidating across multiple holdings simultaneously</li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Database — graph DB for relationships</h2>
          <p>
            Relational DB (Postgres) can store the raw filings, but the core value of this data is traversal — "who else
            is on this board", "shared board members between CRWD and PANW", "where did this person come from". That's
            what graph DBs are built for. Recommended: <strong>Neo4j</strong> (Community Edition, runs via Docker,
            free).
          </p>
          <p>Graph model:</p>
          <ul className="insider-list">
            <li>
              <code>
                (:Person {'{'} cik, name, background {'}'})
              </code>
              <code>
                -[:SERVED_AT {'{'} role, from, to, form3_date {'}'}]-&gt;
              </code>
              <code>
                (:Company {'{'} ticker, name {'}'})
              </code>
            </li>
            <li>
              <code>
                (:Person)-[:FILED_FORM4 {'{'} date, type, shares, price {'}'}]-&gt;(:Company)
              </code>
            </li>
            <li>
              <code>(:Person)-[:CONNECTED_TO]-&gt;(:Person)</code> — inferred from shared board membership
            </li>
          </ul>
          <p>Example Cypher queries:</p>
          <ul className="insider-list">
            <li>
              <code>
                MATCH (p:Person)-[:SERVED_AT]-&gt;(c:Company) WITH p, count(c) AS n WHERE n &gt; 1 RETURN p.name, n
              </code>{' '}
              — people on multiple boards
            </li>
            <li>
              <code>
                MATCH (p)-[:SERVED_AT]-&gt;(:Company {'{'} ticker:'CRWD' {'}'}), (p)-[:SERVED_AT]-&gt;(:Company {'{'}{' '}
                ticker:'PANW' {'}'}) RETURN p.name
              </code>{' '}
              — shared board members
            </li>
            <li>
              <code>
                MATCH (p)-[r:SERVED_AT]-&gt;(c) WHERE r.form3_date &gt; date() - duration({'{'} days:90 {'}'}) RETURN
                p.name, c.ticker, r.role
              </code>{' '}
              — recent joins
            </li>
          </ul>
          <p>
            <strong>Practical order:</strong> store raw Form 3/4 data in Postgres first (just filings, fast to
            implement). Add Neo4j when building the person profile / network graph UI — don't run two DBs before there's
            anything to show.
          </p>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Implementation plan</h2>
          <ul className="insider-list">
            <li>Add Form 3, Form 4, Form 5 to SEC EDGAR download pipeline (same client, just add to form types)</li>
            <li>
              Parse XML from Form 4 — SEC provides machine-readable XBRL for these (different from 10-K/8-K, actually
              parseable)
            </li>
            <li>
              Postgres first: <code>insider_persons</code> (sec_cik, name, background_category, first_seen),{' '}
              <code>insider_transactions</code> (person_cik, company_ticker, form_type, date, type, shares, price),{' '}
              <code>insider_appointments</code> (person_cik, company_ticker, role, form3_date, press_release_date)
            </li>
            <li>
              Neo4j later: migrate relationship layer — nodes for Person + Company, edges for SERVED_AT / FILED_FORM4 /
              CONNECTED_TO
            </li>
            <li>UI: person profile page — all their companies, all transactions, timeline view</li>
            <li>UI: company insider page — current insiders, recent Form 4s, new appointments</li>
            <li>UI: network graph — shared board members, person-to-person connections via shared companies</li>
            <li>Alert: Form 3 filed → notify immediately (before press release window)</li>
            <li>Alert: cluster buy (3+ insiders buying same company within 5 days)</li>
          </ul>
        </section>

        <section className="insider-section insider-section--reminder">
          <h2 className="insider-section-title">Technical reminders</h2>
          <ul className="insider-list">
            <li>
              Form 4 XML at{' '}
              <code>
                https://www.sec.gov/Archives/edgar/data/{'{cik}'}/{'{accession}'}/{'{filename}'}.xml
              </code>{' '}
              — parse <code>nonDerivativeTable</code> and <code>derivativeTable</code> nodes
            </li>
            <li>
              Reporting person CIK is in the <code>reportingOwner</code> section — extract and store it (this is the
              person CIK, not company CIK)
            </li>
            <li>
              Transaction codes: <code>P</code> = open-market purchase (signal), <code>S</code> = sale, <code>A</code> =
              option grant (noise)
            </li>
            <li>
              Form 3 has no transaction data — it just establishes ownership. The signal is the filing date itself
            </li>
            <li>Form 3 filing date often precedes press release by days — it is the earliest public timestamp</li>
            <li>
              SEC EDGAR full-text search at <code>efts.sec.gov</code> — find all filings by a person CIK across all
              companies
            </li>
            <li>
              Unit 8200 = Israeli Intelligence Corps — alumni density is highest at Check Point, CrowdStrike, Palo Alto,
              Wiz, Claroty
            </li>
          </ul>
        </section>
      </div>
    </Page>
  );
}
