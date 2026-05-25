import { Link } from 'react-router-dom';
import Page from '@/components/common/layout/Page';
import '../InsiderIntel/InsiderIntel.css';

export default function EdgarEntities() {
  return (
    <Page title="SEC EDGAR — Entity Types Beyond Companies & People">
      <Link to="/research" className="research-back">
        ← Research & Strategy
      </Link>

      <div className="insider-sections">
        <section className="insider-section insider-section--note">
          <h2 className="insider-section-title">Counterparties in material contracts — biggest gap</h2>
          <p>
            Every time a covered company signs a material contract, the 8-K Item 1.01 names the counterparty. Build an
            entity graph of who is contracting with whom.
          </p>
          <p>
            Over time this produces a map of customer concentration, partnership networks, and channel relationships not
            visible in any other public source. A CRWD contract with a major bank, a PANW contract with a government
            agency — these are not tracked anywhere systematically.
          </p>
          <ul className="insider-list">
            <li>Extract counterparty names from 8-K Item 1.01 text (NLP / regex on the filing body)</li>
            <li>Categorize: customer, partner, reseller, supplier, government agency</li>
            <li>Track frequency: same counterparty appearing across multiple companies = key relationship node</li>
            <li>Cross with revenue concentration in 10-K (customers &gt;10% of revenue must be named)</li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Law firms</h2>
          <p>
            Every material filing lists outside counsel. The firm signals the transaction type before the deal is
            described.
          </p>
          <ul className="insider-list">
            <li>
              <strong>Skadden / Wachtell</strong> → hostile or complex M&A. Wachtell only does large deals
            </li>
            <li>
              <strong>Wilson Sonsini</strong> → Silicon Valley tech M&A, IPOs, VC-backed companies
            </li>
            <li>
              <strong>Latham & Watkins</strong> → debt financings, leveraged buyouts
            </li>
            <li>
              <strong>DLA Piper / Cooley</strong> → mid-market tech, growth-stage
            </li>
            <li>Law firm appearing in S-4 or DEFM14A = deal is already agreed, counsel retained for closing</li>
            <li>Same firm advising acquirer and target in different deals = relationship network, not conflict</li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Auditors</h2>
          <ul className="insider-list">
            <li>Small → Big Four switch = company professionalizing, pre-IPO or pre-acquisition prep</li>
            <li>Big Four → smaller auditor = red flag. Investigate why (cost cutting, auditor resignation)</li>
            <li>8-K Item 4.01 = auditor resigned or dismissed. Extremely rare, investigate immediately</li>
            <li>8-K Item 4.02 = auditor disagrees with financial statements. Near-certain restatement incoming</li>
            <li>PCAOB inspection reports on the auditor firm — some audit shops have chronic issues</li>
            <li>
              Auditor who also audits a direct competitor has cross-visibility — watch their public statements for
              sector signals
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Investment banks & underwriters</h2>
          <ul className="insider-list">
            <li>Every S-1, S-3, 424B4 lists the underwriting syndicate — lead bank signals deal quality</li>
            <li>
              <strong>Goldman / Morgan Stanley</strong> leading = institutional quality, large deal
            </li>
            <li>
              <strong>Qatalyst Partners</strong> = dominant tech M&A boutique. If Qatalyst is named, a deal is happening
            </li>
            <li>Boutique bank leading = company couldn't get bulge bracket, or niche deal</li>
            <li>Bank that underwrote the IPO typically gets the M&A mandate later — track the relationship</li>
            <li>
              Selling shareholders in S-3 = VCs distributing. When Sequoia / a16z file to sell, the lockup story is
              ending
            </li>
            <li>PIPE investors in private placements — who came in at what price, when does lockup end</li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Regulators</h2>
          <ul className="insider-list">
            <li>
              <strong>FTC / DOJ</strong> — HSR merger clearance filings are confidential, but withdrawn HSR notices are
              public. A withdrawal = deal fell apart before announcement
            </li>
            <li>
              <strong>CFIUS</strong> — foreign investment review. Relevant for Israeli cybersecurity companies (Unit
              8200 connections) being acquired. CFIUS blocks are public and named
            </li>
            <li>
              <strong>CISA</strong> — KEV additions name the affected product and vendor. Which covered company's
              product just got added = liability signal. Which company provides the patch = revenue signal
            </li>
            <li>
              <strong>SEC itself</strong> — Wells Notice disclosures in 8-K. Company just received a formal
              investigation warning. Rare but severe
            </li>
          </ul>
        </section>

        <section className="insider-section">
          <h2 className="insider-section-title">Certification & standards bodies</h2>
          <ul className="insider-list">
            <li>
              <strong>FedRAMP</strong> — authorization unlocks the entire federal sales channel. 12–18 month sales
              cycle. Not in filings until the contract 8-K, but FedRAMP.gov publishes authorizations publicly
            </li>
            <li>
              <strong>Common Criteria</strong> — defense and intelligence procurement prerequisite. Companies that
              achieve this are entering a new buyer category
            </li>
            <li>
              <strong>FIPS 140-2/3</strong> — cryptographic module certification required for federal crypto use. Newly
              certified = federal pipeline opening
            </li>
            <li>
              These don't appear in EDGAR but cross-referencing with 8-K contract announcements confirms the sales
              unlock
            </li>
          </ul>
        </section>

        <section className="insider-section insider-section--reminder">
          <h2 className="insider-section-title">Implementation notes</h2>
          <ul className="insider-list">
            <li>
              Counterparty extraction: parse 8-K Item 1.01 body text — named entities (NLP) or regex for "Agreement with
              [Company]", "entered into a contract with [Company]"
            </li>
            <li>Law firm / bank extraction: parse signature blocks and "Exhibit 23" (auditor consent) in filings</li>
            <li>Auditor is in the 10-K cover page and Exhibit 23 — structured, easy to extract</li>
            <li>
              FedRAMP authorizations: <code>https://marketplace.fedramp.gov/api/products</code> — public JSON, no auth
              required
            </li>
            <li>CFIUS block notices: published in Federal Register, searchable by company name</li>
            <li>All of these become nodes in the Neo4j graph alongside Person and Company</li>
          </ul>
        </section>
      </div>
    </Page>
  );
}
