import { Link } from 'react-router-dom';
import Page from '@/components/common/Page';
import '../InsiderIntel/InsiderIntel.css';

export default function EdgarUses() {
  return (
    <Page title="SEC EDGAR — Beyond the basics">
      <Link to="/research" className="research-back">
        ← Research & Strategy
      </Link>

      <div className="insider-sections">
        <section className="insider-section insider-section--note">
          <h2 className="insider-section-title">What we already download</h2>
          <ul className="insider-list">
            <li>
              <strong>10-K</strong> — annual report
            </li>
            <li>
              <strong>10-Q</strong> — quarterly report
            </li>
            <li>
              <strong>8-K</strong> — material events (earnings, contracts, exec changes, breaches)
            </li>
            <li>
              <strong>DEF 14A</strong> — proxy statement (board votes, CEO comp)
            </li>
            <li>
              <strong>SC 13G / SC 13D</strong> — institutional ownership crosses 5%
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Insider filings — add to pipeline</h2>
          <ul className="insider-list">
            <li>
              <strong>Form 3</strong> — new insider established. Filed within 10 days. Often before press release. See
              Insider Intel plan
            </li>
            <li>
              <strong>Form 4</strong> — insider transaction. Open-market buys (code P) are the signal. Option grants
              (code A) are noise
            </li>
            <li>
              <strong>Form 5</strong> — annual catch-up for transactions not reported on Form 4. Low signal but needed
              for completeness
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">M&A signals — highest value</h2>
          <ul className="insider-list">
            <li>
              <strong>425</strong> — filed during merger discussions, before any public announcement. Earliest M&A
              signal on EDGAR. Watch smaller cybersecurity companies for these if PANW/CRWD could be acquirers
            </li>
            <li>
              <strong>SC TO-T</strong> — tender offer. Someone is trying to buy the company
            </li>
            <li>
              <strong>SC TO-I</strong> — issuer tender offer. Company buying back its own shares. Strong signal of
              management confidence
            </li>
            <li>
              <strong>DEFM14A</strong> — proxy for a merger vote. Deal is already agreed, shareholder vote pending
            </li>
            <li>
              <strong>S-4</strong> — registration for merger. Acquiring company issuing new shares as consideration
            </li>
            <li>
              <strong>SC 13D</strong> — activist crossed 5%. Distinct from passive 13G — this person has intent. Often
              precedes M&A or board fight
            </li>
            <li>
              <strong>SC 13D/A</strong> — amendment to 13D. Position increased or decreased. Track direction
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Capital raise signals</h2>
          <ul className="insider-list">
            <li>
              <strong>S-3</strong> — shelf registration. Company preparing to raise capital. Secondary offering
              typically follows within months
            </li>
            <li>
              <strong>424B4</strong> — final prospectus. The offering just happened — dilution is confirmed
            </li>
            <li>
              <strong>FWP</strong> — free writing prospectus. Marketing material for an upcoming offering
            </li>
            <li>
              <strong>S-1</strong> — IPO registration. Useful for tracking pre-IPO cybersecurity companies entering the
              universe
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Distress signals — short alerts</h2>
          <ul className="insider-list">
            <li>
              <strong>NT 10-K / NT 10-Q</strong> — "we cannot file on time". Almost always precedes a restatement,
              auditor issue, or internal controls failure. Strong negative signal
            </li>
            <li>
              <strong>8-K Item 4.02</strong> — auditor disagrees with financial statements. Extremely rare, extremely
              bad
            </li>
            <li>
              <strong>8-K Item 4.01</strong> — auditor resigned or was dismissed. Investigate immediately
            </li>
            <li>
              <strong>15-12G</strong> — deregistration. Company going dark: delisting, going private, or absorbed by
              acquirer
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Executive & governance signals</h2>
          <ul className="insider-list">
            <li>
              <strong>8-K Item 5.02</strong> — executive departure or appointment. Often faster than press release.
              Watch for CISO departures at covered companies
            </li>
            <li>
              <strong>8-K Item 1.01</strong> — material definitive agreement. New contract, partnership, or credit
              facility
            </li>
            <li>
              <strong>8-K Item 2.03</strong> — new debt obligation. Company just took on significant debt
            </li>
            <li>
              <strong>DEF 14A parsing</strong> — already downloaded. Worth parsing: CEO pay ratio, option grant timing
              relative to announcements, clawback policies, board composition changes
            </li>
          </ul>
        </section>

        <section className="insider-section insider-section--reminder">
          <h2 className="insider-section-title">Priority additions to pipeline</h2>
          <ul className="insider-list">
            <li>
              <strong>Form 3 / 4 / 5</strong> — prerequisite for Insider Intel plan
            </li>
            <li>
              <strong>425</strong> — earliest M&A signal, underused, high value
            </li>
            <li>
              <strong>SC 13D / 13D/A</strong> — activist positions, add to existing 13G download
            </li>
            <li>
              <strong>NT 10-K / NT 10-Q</strong> — distress alert, easy to add, strong signal-to-noise ratio
            </li>
            <li>
              <strong>S-3</strong> — capital raise warning, relevant for position sizing
            </li>
          </ul>
        </section>
      </div>
    </Page>
  );
}
