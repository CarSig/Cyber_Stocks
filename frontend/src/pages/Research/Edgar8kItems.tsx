import { Link } from 'react-router-dom';
import Page from '@/components/common/layout/Page';
import '../InsiderIntel/InsiderIntel.css';

export default function Edgar8kItems() {
  return (
    <Page title="SEC EDGAR — 8-K Items">
      <Link to="/research" className="research-back">
        ← Research & Strategy
      </Link>

      <div className="insider-sections">
        <section className="insider-section insider-section--note">
          <h2 className="insider-section-title">Overview</h2>
          <p>
            8-K filings use standardized item numbers (Regulation S-K Item 1–9 series) to indicate what type of material
            event occurred. Parsing these item numbers from the filing body is the key to unlocking structured signals
            from the 8-K download pipeline — without needing to NLP the full text.
          </p>
          <p>
            Below is the complete current standard list, organized by section, with implementation notes and signal
            priority for each item.
          </p>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Section 1 — Business / Legal Events</h2>
          <ul className="insider-list">
            <li>
              <strong>1.01</strong> — Entry into a Material Definitive Agreement. New contract, partnership, or credit
              facility. <em>High priority.</em> Extract counterparty name for entity graph.
            </li>
            <li>
              <strong>1.02</strong> — Termination of a Material Definitive Agreement. Lost contract or partnership.
              <em> Medium priority.</em> Often precedes revenue guidance changes.
            </li>
            <li>
              <strong>1.03</strong> — Bankruptcy or Receivership. Rare but critical. <em>High priority.</em> Immediate
              short signal.
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Section 2 — Financial Information</h2>
          <ul className="insider-list">
            <li>
              <strong>2.01</strong> — Completion of Acquisition or Disposition of Assets. M&A closed.{' '}
              <em>Medium priority.</em> Confirms deal completion after earlier signals (425, S-4).
            </li>
            <li>
              <strong>2.02</strong> — Results of Operations and Financial Condition (earnings release). Already captured
              via earnings pipeline, but worth flagging when 8-K precedes the formal earnings release.
              <em> Medium priority.</em>
            </li>
            <li>
              <strong>2.03</strong> — Creation of a Direct Financial Obligation or Off-Balance Sheet Arrangement. New
              debt. <em>High priority.</em> Track debt accumulation, interest rates, covenants.
            </li>
            <li>
              <strong>2.04</strong> — Triggering Events That Accelerate or Increase a Direct Financial Obligation.
              Default or acceleration. <em>High priority.</em> Rare, critical distress signal.
            </li>
            <li>
              <strong>2.05</strong> — Costs Associated with Exit or Disposal Activities. Restructuring, layoffs.
              <em> Medium priority.</em> Cost-cutting signal.
            </li>
            <li>
              <strong>2.06</strong> — Material Impairments. Write-down of assets. <em>Medium priority.</em> Often
              precedes restatement or indicates overpayment for acquisitions.
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Section 3 — Securities & Trading Markets</h2>
          <ul className="insider-list">
            <li>
              <strong>3.01</strong> — Notice of Delisting or Failure to Satisfy Listing Rules. Exchange notification.
              <em> High priority.</em> Immediate distress signal.
            </li>
            <li>
              <strong>3.02</strong> — Unregistered Sales of Equity Securities. Dilutive private placement.
              <em> Medium priority.</em> Track for dilution alerts.
            </li>
            <li>
              <strong>3.03</strong> — Material Modification to Rights of Security Holders. Changes to shareholder
              rights. <em>Low priority.</em> Rarely actionable.
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Section 4 — Accounting & Governance</h2>
          <ul className="insider-list">
            <li>
              <strong>4.01</strong> — Changes in Registrant's Certifying Accountant. Auditor resigned or was dismissed.
              <em> High priority.</em> Investigate immediately — often precedes restatement or internal control issues.
            </li>
            <li>
              <strong>4.02</strong> — Non-Reliance on Previously Issued Financial Statements. Auditor disagrees with
              financials. <em>Highest priority.</em> Extremely rare, near-certain restatement incoming.
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Section 5 — Corporate Governance / Management</h2>
          <ul className="insider-list">
            <li>
              <strong>5.01</strong> — Changes in Control of Registrant. Change of control event.
              <em> High priority.</em> Often precedes or follows M&A.
            </li>
            <li>
              <strong>5.02</strong> — Departure or Election of Directors or Certain Officers. Executive departure or
              appointment. <em>Highest priority.</em> Often faster than press release. Watch for CISO departures at
              covered companies.
            </li>
            <li>
              <strong>5.03</strong> — Amendments to Articles of Incorporation or Bylaws. Corporate governance changes.
              <em> Low priority.</em> Contextual but rarely a trading signal.
            </li>
            <li>
              <strong>5.04</strong> — Temporary Suspension of Trading Under Employee Benefit Plans. Blackout period.
              <em> Low priority.</em> Compliance item.
            </li>
            <li>
              <strong>5.05</strong> — Amendments to Code of Ethics or Waiver of Code of Ethics.
              <em> Low priority.</em> Rarely actionable.
            </li>
            <li>
              <strong>5.06</strong> — Change in Shell Company Status. <em>Low priority.</em> SPAC-related.
            </li>
            <li>
              <strong>5.07</strong> — Submission of Matters to a Vote of Security Holders. Shareholder vote results.
              <em> Medium priority.</em> Track activist vote outcomes, board election results.
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Section 6 — Asset-Backed Securities (ABS-specific)</h2>
          <ul className="insider-list">
            <li>
              <strong>6.01</strong> — ABS Informational and Computational Material. <em>Low priority.</em> ABS-specific.
            </li>
            <li>
              <strong>6.02</strong> — Change of Servicer or Trustee. <em>Low priority.</em> ABS-specific.
            </li>
            <li>
              <strong>6.03</strong> — Change in Credit Enhancement or Other External Support.
              <em> Low priority.</em> ABS-specific.
            </li>
            <li>
              <strong>6.04</strong> — Failure to Make a Required Distribution. <em>Low priority.</em> ABS-specific.
            </li>
            <li>
              <strong>6.05</strong> — Securities Act Updating Disclosure (ABS-related updates).
              <em> Low priority.</em> ABS-specific.
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Section 7 — Regulation FD / Disclosure</h2>
          <ul className="insider-list">
            <li>
              <strong>7.01</strong> — Regulation FD Disclosure. Selective disclosure fairness rule. Company disclosed
              material information to a select group (analysts, investors) and is now making it public.
              <em> Medium priority.</em> Often contains forward-looking commentary not in other sections.
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Section 8 — Other Events</h2>
          <ul className="insider-list">
            <li>
              <strong>8.01</strong> — Other Events. Catch-all bucket — very commonly used. Companies file material
              events here when no other item fits. <em>High priority.</em> Requires text parsing since the item number
              alone doesn't indicate the event type.
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Section 9 — Financial Statements & Exhibits</h2>
          <ul className="insider-list">
            <li>
              <strong>9.01</strong> — Financial Statements and Exhibits. Attached exhibits to the filing.
              <em> Medium priority.</em> Contains the actual contract text, press release, or other supporting
              documents. Needed for counterparty extraction (Item 1.01) and full-text analysis.
            </li>
          </ul>
        </section>

        <section className="insider-section insider-section--reminder">
          <h2 className="insider-section-title">Implementation priority</h2>
          <ul className="insider-list">
            <li>
              <strong>Phase 1 — Parse item numbers from existing 8-K downloads.</strong> The 8-K XML/HTML body contains
              item number references. Extract via regex on the filing body text. Low effort, high value.
            </li>
            <li>
              <strong>Phase 2 — Tag each 8-K with its item number(s).</strong> Store as a separate field or tag array.
              Enables filtering and alerting by event type.
            </li>
            <li>
              <strong>Phase 3 — Build alerts for high-priority items.</strong> Items 4.02, 5.02, 1.05 (breach), 2.04,
              3.01, 4.01 should trigger immediate notifications.
            </li>
            <li>
              <strong>Phase 4 — Counterparty extraction from Item 1.01.</strong> NLP or regex on the filing body to
              extract named entities from material agreement disclosures.
            </li>
            <li>
              <strong>Phase 5 — Historical backfill.</strong> Re-process all previously downloaded 8-K filings to
              extract item numbers and build a historical signal database.
            </li>
          </ul>
        </section>
      </div>
    </Page>
  );
}
