import { Link } from 'react-router-dom';
import Page from '@/components/common/Page';
import '../InsiderIntel/InsiderIntel.css';

export default function GovContracts() {
  return (
    <Page title="Government Contracts — Public Data Sources">
      <Link to="/research" className="research-back">
        ← Research & Strategy
      </Link>

      <div className="insider-sections">
        <section className="insider-section insider-section--note">
          <h2 className="insider-section-title">Why this matters for cybersecurity stocks</h2>
          <p>
            Federal contracts are a primary revenue driver for most covered companies — DHS, DoD, NSA, CISA, and
            intelligence community spending runs into the billions annually. A major contract win or loss is material
            and often hits public databases before the company files an 8-K or issues a press release.
          </p>
          <p>
            USASpending.gov publishes every federal contract award. SAM.gov shows which companies are actively
            registered to pursue federal business. Combining both gives you a leading indicator of federal revenue that
            isn't visible in earnings until 1–2 quarters later.
          </p>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">USASpending.gov — primary source</h2>
          <p>
            Every federal contract and grant, public, free, updated daily. Has a REST API — no auth required for read
            access.
          </p>
          <ul className="insider-list">
            <li>Search by recipient name (company) or UEI / DUNS number</li>
            <li>Filter by awarding agency: DHS, DoD, CISA, NSA, FBI, CIA, State Dept</li>
            <li>
              Fields: award amount, period of performance, description, place of performance, prime vs subcontract
            </li>
            <li>
              API endpoint: <code>https://api.usaspending.gov/api/v2/search/spending_by_award/</code>
            </li>
            <li>Watch for: new awards &gt;$5M, contract renewals, IDIQ task orders (ongoing relationship)</li>
            <li>
              Cross with 8-K Item 1.01 — did the company disclose it? If not, was it material enough to require
              disclosure?
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">SAM.gov — federal business intent</h2>
          <p>
            System for Award Management. Companies must register here to receive any federal contract. Active
            registration = actively pursuing federal business.
          </p>
          <ul className="insider-list">
            <li>
              Registration status change = intent signal. New registration from a company that wasn't federal-focused
              before
            </li>
            <li>Deregistration = red flag. Company exiting federal market or administrative failure</li>
            <li>NAICS codes on the registration reveal which contract categories the company is pursuing</li>
            <li>Cage code (unique federal ID) — use this to query USASpending more precisely than company name</li>
            <li>
              API: <code>https://api.sam.gov/entity-information/v3/entities</code> — free with API key
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">FedRAMP — cloud authorization unlock</h2>
          <p>
            Federal Risk and Authorization Management Program. Required for cloud products sold to federal agencies.
            Authorization takes 12–18 months and unlocks the entire federal cloud sales channel at once — a step-change
            revenue event, not gradual.
          </p>
          <ul className="insider-list">
            <li>
              Public marketplace: <code>https://marketplace.fedramp.gov/api/products</code> — free JSON, no auth
            </li>
            <li>
              Cybersecurity &amp; Risk Management products in process:{' '}
              <a
                className="insider-link"
                href="https://www.fedramp.gov/marketplace/products/?view=cards&business_function=Cybersecurity+%26+Risk+Management&status=Agency+Authorization+In+Process"
                target="_blank"
                rel="noreferrer"
              >
                fedramp.gov marketplace → Cybersecurity &amp; Risk Management · In Process
              </a>
            </li>
            <li>
              Fields: product name, company, authorization date, sponsoring agency, impact level (Low / Moderate / High)
            </li>
            <li>High impact = DoD and intelligence community eligible. Moderate = civilian agencies</li>
            <li>New authorization often precedes a federal contract surge by 1–2 quarters</li>
            <li>Watch for: covered company product getting authorized, or a competitor losing authorization</li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">SBIR / STTR grants — early R&D signal</h2>
          <p>
            Small Business Innovation Research program. DARPA, DHS, NSA, and DoD fund early-stage research through these
            grants. A Phase II SBIR from DARPA or DHS is the intelligence community validating that a capability is
            worth developing — 2–4 years before it becomes a product.
          </p>
          <ul className="insider-list">
            <li>
              Database: <code>https://www.sbir.gov/api</code> — free, searchable by company and agency
            </li>
            <li>
              Phase I (~$150–300K) = feasibility study. Phase II (~$1–2M) = full development. Phase III =
              commercialization (no grant, just contracts)
            </li>
            <li>Relevant agencies: DARPA, DHS S&T, NSA, Air Force Research Lab, AFWERX</li>
            <li>A covered company winning Phase II SBIR = new capability incoming, likely fed-adjacent product line</li>
            <li>
              A smaller private company winning SBIR in a domain your companies operate in = potential acquisition
              target or future competitor
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Contract vehicles — IDIQ and GWACs</h2>
          <p>
            Most large federal contracts are awarded under pre-competed vehicles. Getting on a vehicle is a prerequisite
            for winning task orders — a company on the vehicle has recurring revenue potential for years.
          </p>
          <ul className="insider-list">
            <li>
              <strong>CIO-SP4</strong> — NIH's $50B IT services vehicle. One of the largest. On/off status is public
            </li>
            <li>
              <strong>SEWP V</strong> — NASA's $20B products and services vehicle. Heavy cybersecurity usage
            </li>
            <li>
              <strong>Alliant 2</strong> — GSA's $50B IT services GWAC
            </li>
            <li>
              <strong>8(a) STARS III</strong> — small business set-aside, but primes use it. Watch which large companies
              team with small 8(a) holders
            </li>
            <li>
              <strong>CMMC certification</strong> — DoD's new cybersecurity maturity model. Required for any DoD
              contract by 2025–2026. Companies offering CMMC assessments = new revenue category
            </li>
            <li>Vehicle awardee lists are public — check if a covered company was added or dropped at recompete</li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Signals worth alerting on</h2>
          <ul className="insider-list">
            <li>New USASpending award &gt;$10M to covered company from DHS / DoD / IC agency</li>
            <li>Award description mentions competitor by name (replacement contract)</li>
            <li>FedRAMP High authorization for a covered company's product</li>
            <li>SAM.gov registration lapse at a covered company (administrative red flag)</li>
            <li>Phase II SBIR award to a private cybersecurity company in covered domain (acquisition watch)</li>
            <li>Contract vehicle recompete — covered company added or dropped from major IDIQ</li>
          </ul>
        </section>

        <section className="insider-section insider-section--reminder">
          <h2 className="insider-section-title">Implementation notes</h2>
          <ul className="insider-list">
            <li>
              USASpending API: POST to <code>/api/v2/search/spending_by_award/</code> with filters for recipient name
              and date range. Returns paginated JSON
            </li>
            <li>Map covered tickers to UEI numbers via SAM.gov — UEI is more reliable than name matching</li>
            <li>
              FedRAMP: poll <code>marketplace.fedramp.gov/api/products</code> weekly, diff against stored list for new
              authorizations
            </li>
            <li>
              SBIR: poll <code>www.sbir.gov/api/awards</code> with keyword filter (endpoint-security, zero-trust,
              threat-intelligence) and agency filter
            </li>
            <li>
              Store contract awards as a new entity type in Neo4j: <code>(:Award)-[:AWARDED_TO]-&gt;(:Company)</code>,{' '}
              <code>(:Award)-[:AWARDED_BY]-&gt;(:Agency)</code>
            </li>
            <li>Cross-reference: award date vs next earnings call — did management mention it? If not, why?</li>
          </ul>
        </section>
      </div>
    </Page>
  );
}
