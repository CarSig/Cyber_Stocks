import { Link } from 'react-router-dom';
import Page from '@/components/common/Page';
import '../InsiderIntel/InsiderIntel.css';

export default function EdgarDeeper() {
  return (
    <Page title="SEC EDGAR — Deeper Signals">
      <Link to="/research" className="research-back">
        ← Research & Strategy
      </Link>

      <div className="insider-sections">
        <section className="insider-section insider-section--note">
          <h2 className="insider-section-title">8-K Item 1.05 — Breach disclosure (2023)</h2>
          <p>
            SEC rule added in 2023. Companies must disclose a material cybersecurity incident within 4 business days of
            determining it is material. This is new and undermonitored.
          </p>
          <p>
            A breach at one covered company is a direct signal for the others — customer churn toward competitors,
            regulatory scrutiny across the sector, market share shift. Already downloading 8-K; just needs item number
            parsing to isolate these.
          </p>
          <ul className="insider-list">
            <li>
              <strong>Item 1.05</strong> — cybersecurity incident disclosure. Parse specifically, alert immediately
            </li>
            <li>
              <strong>Item 7.01 / 8.01</strong> — Regulation FD disclosure. Companies publish info shared with analysts
              here — sometimes guidance or product announcements buried in these
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">CORRESP — SEC comment letters</h2>
          <p>
            When the SEC thinks a filing looks wrong, they send a private comment letter. The company responds. When the
            issue is resolved, both letters are published on EDGAR.
          </p>
          <p>
            You can see exactly what the SEC was questioning — revenue recognition, contract accounting, cyber incident
            disclosure adequacy, aggressive capitalization. Very revealing about what management was trying to hide or
            obscure.
          </p>
          <ul className="insider-list">
            <li>
              <strong>CORRESP</strong> — SEC's letter to the company
            </li>
            <li>
              <strong>UPLOAD</strong> — company's response before resolution
            </li>
            <li>
              Search:{' '}
              <code>
                efts.sec.gov/efts/hits.json?q=%22cybersecurity%22&dateRange=custom&startdt=2024-01-01&forms=CORRESP
              </code>
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">DEF 14A — deeper proxy parsing</h2>
          <ul className="insider-list">
            <li>
              <strong>Say-on-pay vote result</strong> — if shareholders reject exec comp (rare), signals board friction
            </li>
            <li>
              <strong>Board skill matrix</strong> — who has cybersecurity expertise listed. Companies that recently
              added a "cybersecurity expert" director are responding to something
            </li>
            <li>
              <strong>Related party transactions</strong> — executives doing business with the company. Conflicts of
              interest
            </li>
            <li>
              <strong>Shareholder proposals</strong> — activists submitting proposals tells you what pressure is
              building before it becomes public
            </li>
            <li>
              <strong>Option grant timing</strong> — grants issued just before a positive announcement = backdating risk
              or information asymmetry
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Form 144 — insider sale incoming</h2>
          <p>
            Filed <strong>before</strong> the sale happens — 2-day early warning that an insider is about to sell.
            Unlike Form 4 which is filed after. Low effort to add, same pipeline as Form 4.
          </p>
          <ul className="insider-list">
            <li>Form 144 = notice of proposed sale of restricted securities</li>
            <li>2-day lead time before the Form 4 confirms the sale</li>
            <li>Combine with Form 4 history: is this person a serial seller or first time?</li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Form 4 — derivative table (deeper)</h2>
          <p>
            Already in the Form 4 XML — just needs parsing of the <code>derivativeTable</code> node in addition to{' '}
            <code>nonDerivativeTable</code>.
          </p>
          <ul className="insider-list">
            <li>Option exercise + immediate sale → liquidation, not conviction</li>
            <li>Option exercise + hold → strong conviction signal, insider paying taxes to keep shares</li>
            <li>Deep in-the-money exercise + hold → very high conviction</li>
            <li>Strike price visible in XML — compare to current price for context</li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">SC 13F — institutional fund flows</h2>
          <p>
            Every fund with &gt;$100M AUM files quarterly. Track when major funds enter or exit covered companies.
            45-day lag after quarter end, but useful for understanding who holds what and whether smart money is
            building or exiting.
          </p>
          <ul className="insider-list">
            <li>Large files — need filtering by fund name or covered ticker list</li>
            <li>Watch for new positions from Tiger Global, Coatue, D1 (tech-focused funds) in cybersecurity names</li>
            <li>Simultaneous exits across multiple funds = distribution, not noise</li>
            <li>Cross with 13D/13G: fund went from passive 13G to activist 13D — something changed</li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Debt & dilution signals</h2>
          <ul className="insider-list">
            <li>
              <strong>424B2 / 424B3</strong> — prospectus supplements for convertible notes. Convertible debt at a
              discount = company couldn't get straight debt. Negative signal
            </li>
            <li>
              <strong>8-K Item 2.04</strong> — acceleration or default triggered under a debt agreement. Rare, critical
            </li>
            <li>
              <strong>8-K Item 2.03</strong> — new material debt obligation. How much, at what rate, covenants?
            </li>
            <li>
              <strong>Form 8-A</strong> — new class of securities registered. Often precedes a spinoff or dual-class
              restructuring
            </li>
          </ul>
        </section>

        <section className="insider-section insider-section--reminder">
          <h2 className="insider-section-title">Priority additions to pipeline</h2>
          <ul className="insider-list">
            <li>
              <strong>8-K Item 1.05</strong> — breach disclosure. Already download 8-K, just parse item number. Highest
              value, lowest effort
            </li>
            <li>
              <strong>Form 144</strong> — insider sale warning. Same pipeline as Form 4, adds 2-day lead
            </li>
            <li>
              <strong>Form 4 derivative table</strong> — already in XML, just needs parsing of{' '}
              <code>derivativeTable</code> node
            </li>
            <li>
              <strong>CORRESP</strong> — SEC scrutiny signal. Different endpoint, worth adding for distress detection
            </li>
            <li>
              <strong>SC 13F</strong> — fund flows. Medium effort, large files, filter to covered tickers only
            </li>
          </ul>
        </section>
      </div>
    </Page>
  );
}
