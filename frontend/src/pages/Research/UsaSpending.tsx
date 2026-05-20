import { Link } from 'react-router-dom';
import Page from '@/components/common/Page';
import '../InsiderIntel/InsiderIntel.css';

export default function UsaSpending() {
  return (
    <Page title="USASpending.gov — Federal Contract Intelligence">
      <Link to="/research" className="research-back">
        ← Research & Strategy
      </Link>

      <div className="insider-sections">
        <section className="insider-section insider-section--note">
          <h2 className="insider-section-title">Why this is underused</h2>
          <p>
            Every federal contract award is published here within days of signing — no auth required, free REST API. For
            cybersecurity companies where federal revenue is 20–40% of total, this is a leading indicator that shows up
            1–2 quarters before it hits earnings.
          </p>
          <p>
            A $47M DHS CISA contract win for CRWD will appear on USASpending before any 8-K, press release, or analyst
            note. A DoD renewal lost to a competitor is a revenue headwind visible here before management addresses it
            on an earnings call.
          </p>
          <ul className="insider-list">
            <li>No API key required</li>
            <li>Updated daily</li>
            <li>Covers all federal agencies: DHS, DoD, NSA, FBI, CIA, State, Treasury, HHS</li>
            <li>
              Marketplace:{' '}
              <a className="insider-link" href="https://www.usaspending.gov" target="_blank" rel="noreferrer">
                usaspending.gov
              </a>
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">What each award record contains</h2>
          <ul className="insider-list">
            <li>
              <strong>Recipient name + UEI</strong> — legal entity that received the award. May be a subsidiary, not the
              parent ticker
            </li>
            <li>
              <strong>Awarding agency + sub-agency</strong> — e.g. DHS → CISA, DoD → Defense Information Systems Agency
              (DISA)
            </li>
            <li>
              <strong>Award amount + total obligated</strong> — base amount vs ceiling. IDIQ contracts have large
              ceilings but small initial obligations
            </li>
            <li>
              <strong>Period of performance</strong> — start and end date. Renewal window is visible in advance
            </li>
            <li>
              <strong>Description</strong> — free text, often vague ("IT services") but sometimes names the product or
              platform
            </li>
            <li>
              <strong>Award type</strong> — definitive contract, IDIQ, purchase order, grant, BPA call
            </li>
            <li>
              <strong>Place of performance</strong> — where the work is done. DC metro = federal ops, not commercial
            </li>
            <li>
              <strong>Prime vs subcontract</strong> — prime is the direct relationship; subcontracts show ecosystem
              partnerships
            </li>
            <li>
              <strong>NAICS code</strong> — industry classification. 541512 (Computer Systems Design), 541519 (Other
              Computer Related), 541690 (Scientific Consulting) are the relevant ones
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Key API endpoints</h2>
          <ul className="insider-list">
            <li>
              <strong>Award search</strong> — main query endpoint:
              <br />
              <code>POST https://api.usaspending.gov/api/v2/search/spending_by_award/</code>
            </li>
            <li>
              <strong>Recipient profile</strong> — all awards to a specific UEI:
              <br />
              <code>GET https://api.usaspending.gov/api/v2/recipient/uei/{'{uei}'}/</code>
            </li>
            <li>
              <strong>Agency awards</strong> — all awards from a specific agency:
              <br />
              <code>GET https://api.usaspending.gov/api/v2/agency/{'{toptier_code}'}/awards/</code>
            </li>
            <li>
              <strong>Award detail</strong> — full record for a specific award:
              <br />
              <code>GET https://api.usaspending.gov/api/v2/awards/{'{award_id}'}/</code>
            </li>
            <li>
              <strong>Autocomplete recipient</strong> — find UEI by company name:
              <br />
              <code>POST https://api.usaspending.gov/api/v2/autocomplete/recipient/</code>
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Search payload structure</h2>
          <p>
            POST body for <code>/api/v2/search/spending_by_award/</code>:
          </p>
          <ul className="insider-list">
            <li>
              <code>filters.recipient_search_text</code> — company name or UEI string
            </li>
            <li>
              <code>filters.time_period</code> — array of{' '}
              <code>
                {'{'} start_date, end_date {'}'}
              </code>
            </li>
            <li>
              <code>filters.award_type_codes</code> — e.g. <code>["A","B","C","D"]</code> for contracts;{' '}
              <code>["02","03","04","05"]</code> for grants
            </li>
            <li>
              <code>filters.awarding_agency_codes</code> — filter to specific agencies (DHS = "070", DoD = "097")
            </li>
            <li>
              <code>filters.naics_codes</code> — filter by industry (541512, 541519, 541690 for cyber/IT)
            </li>
            <li>
              <code>fields</code> — list of fields to return in response
            </li>
            <li>
              <code>sort</code> + <code>order</code> — sort by <code>Award Amount</code> desc to find largest awards
              first
            </li>
            <li>
              <code>limit</code> / <code>page</code> — pagination, max 100 per page
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">UEI — use this, not company name</h2>
          <p>
            Unique Entity Identifier replaced DUNS in 2022. Name matching is unreliable — "CrowdStrike" vs "CrowdStrike
            Inc" vs "CrowdStrike Holdings Inc" all return different results. Get the UEI from SAM.gov once per company
            and store it.
          </p>
          <ul className="insider-list">
            <li>
              SAM.gov search:{' '}
              <a
                className="insider-link"
                href="https://sam.gov/content/entity-registration"
                target="_blank"
                rel="noreferrer"
              >
                sam.gov/content/entity-registration
              </a>
            </li>
            <li>
              SAM.gov API:{' '}
              <code>
                GET https://api.sam.gov/entity-information/v3/entities?legalBusinessName=CrowdStrike&api_key={'{key}'}
              </code>
            </li>
            <li>Store UEI in the company CIK map alongside the SEC CIK — same pattern, different ID space</li>
            <li>Some companies have multiple UEIs (subsidiaries). Map all of them to the parent ticker</li>
            <li>If a company has no SAM registration — they are not pursuing federal contracts at all</li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Signal patterns to watch</h2>
          <ul className="insider-list">
            <li>
              <strong>New award &gt;$10M</strong> from DHS / DoD / IC agency to covered company → material, likely
              precedes 8-K or earnings mention
            </li>
            <li>
              <strong>Award description mentions a competitor</strong> → replacement contract. Source company losing
              revenue
            </li>
            <li>
              <strong>Period of performance ending soon</strong> → renewal window. Watch for re-award or loss
            </li>
            <li>
              <strong>Same agency awarding to a new vendor</strong> in your coverage → incumbent lost, new winner
              gaining federal foothold
            </li>
            <li>
              <strong>Subcontract to covered company</strong> from a defense prime (Booz Allen, Leidos, SAIC) → company
              is in the federal ecosystem without prime contract risk
            </li>
            <li>
              <strong>Private cybersecurity company winning NSA / DARPA contract</strong> → acquisition watch. IC
              validation is a strong signal for strategic buyers
            </li>
            <li>
              <strong>Cluster of small awards</strong> from multiple agencies simultaneously → company is in a federal
              buying cycle, larger contracts likely following
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">High-value agencies for cybersecurity</h2>
          <ul className="insider-list">
            <li>
              <strong>CISA (DHS)</strong> — Cybersecurity and Infrastructure Security Agency. Direct buyer of endpoint,
              threat intel, and network security products
            </li>
            <li>
              <strong>DISA (DoD)</strong> — Defense Information Systems Agency. Runs DoD's global network. Huge IT and
              security spend
            </li>
            <li>
              <strong>NSA</strong> — National Security Agency. Awards often classified or redacted, but unclassified
              contract actions still appear
            </li>
            <li>
              <strong>Cyber Command (USCYBERCOM)</strong> — offensive and defensive cyber operations. Emerging buyer
            </li>
            <li>
              <strong>FBI Cyber Division</strong> — threat intelligence and forensics buyers
            </li>
            <li>
              <strong>State Dept / Diplomatic Security</strong> — underrated buyer, large global footprint
            </li>
            <li>
              <strong>Treasury / FinCEN</strong> — financial sector cybersecurity mandates flowing through here
            </li>
            <li>
              <strong>VA / HHS</strong> — healthcare sector, large attack surface, compliance-driven buyers
            </li>
          </ul>
        </section>

        <section className="insider-section insider-section--reminder">
          <h2 className="insider-section-title">Implementation notes</h2>
          <ul className="insider-list">
            <li>
              Build a <code>company_uei</code> map alongside <code>COMPANY_CIK</code> — same file, same pattern
            </li>
            <li>
              Poll <code>/api/v2/search/spending_by_award/</code> weekly per covered company, store new awards in DB
            </li>
            <li>Alert threshold: new award &gt;$5M from any IC/DHS/DoD agency</li>
            <li>
              Store as Neo4j node: <code>(:Award)-[:AWARDED_TO]-&gt;(:Company)</code>,{' '}
              <code>(:Award)-[:AWARDED_BY]-&gt;(:Agency)</code>, <code>(:Award)-[:DURING]-&gt;(:Period)</code>
            </li>
            <li>
              Cross-reference award date with next earnings call transcript — did management mention it? Omission of a
              large contract is itself a signal
            </li>
            <li>Flag awards where description text mentions a competitor name — parse free-text description field</li>
            <li>No rate limit documented but stay under 10 req/sec — same rule as SEC EDGAR</li>
          </ul>
        </section>
      </div>
    </Page>
  );
}
