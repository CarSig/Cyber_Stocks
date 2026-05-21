import { Link } from 'react-router-dom';
import Page from '@/components/common/Page';
import './Research.css';

const PLANS = [
  {
    to: '/research/insider-intel',
    title: 'Insider Intel',
    subtitle: 'Form 3 / 4 / 5 · Person-level tracking · Neo4j graph',
    description:
      'Track SEC insider filings across all covered companies. Follow individuals across boards, detect cluster buys, and read directional signals from who joins a company before the press release.',
    tag: 'planned',
  },
  {
    to: '/research/edgar-uses',
    title: 'SEC EDGAR — Beyond the basics',
    subtitle: 'SC 13D · 425 · NT 10-K · S-3 · 8-K items',
    description:
      'Full inventory of EDGAR form types worth monitoring — M&A signals, activist positions, capital raises, distress indicators, and executive changes. Reference for expanding the download pipeline.',
    tag: 'reference',
  },
  {
    to: '/research/edgar-deeper',
    title: 'SEC EDGAR — Deeper signals',
    subtitle: 'Item 1.05 · CORRESP · Form 144 · SC 13F · DEF 14A parsing',
    description:
      'Breach disclosures, SEC comment letters, pre-sale insider warnings, institutional fund flows, proxy deep-dives, and convertible debt signals. Higher-effort additions with strong signal-to-noise.',
    tag: 'reference',
  },
  {
    to: '/research/edgar-entities',
    title: 'SEC EDGAR — Entity types',
    subtitle: 'Counterparties · Law firms · Auditors · Banks · Regulators · FedRAMP',
    description:
      'Entity types beyond companies and people: contract counterparties, law firms, underwriters, auditors, regulators (CFIUS, FTC, CISA), and certification bodies. All become nodes in the relationship graph.',
    tag: 'reference',
  },
  {
    to: '/research/edgar-8k-items',
    title: 'SEC EDGAR — 8-K Items',
    subtitle: 'Item 1.01–9.01 · Implementation plan · Signal priority',
    description:
      'Complete inventory of all standardized 8-K items (Regulation S-K Item 1–9 series). Priority-ranked for parsing implementation: breach disclosures, executive changes, material agreements, auditor switches, and more.',
    tag: 'planned',
  },
  {
    to: '/research/gov-contracts',
    title: 'Government Contracts',
    subtitle: 'SAM.gov · FedRAMP · SBIR · IDIQ vehicles · CMMC',
    description:
      'Federal contract ecosystem: SAM.gov registration as intent signal, FedRAMP authorization as revenue unlock, SBIR grants as early R&D validation, and IDIQ vehicle membership for recurring revenue.',
    tag: 'reference',
  },
  {
    to: '/research/usa-spending',
    title: 'USASpending.gov',
    subtitle: 'REST API · UEI mapping · Award signals · Agency breakdown',
    description:
      'Every federal contract award published within days of signing. API endpoints, UEI vs name matching, signal patterns (replacement contracts, renewal windows, IC validation), and high-value agencies for cybersecurity.',
    tag: 'reference',
  },
];

const TAG_COLORS: Record<string, string> = {
  planned: 'var(--color-blue)',
  reference: 'var(--primary)',
  active: '#4ade80',
};

export default function Research() {
  return (
    <Page title="Research & Strategy">
      <p className="research-subtitle">Internal notes, plans, and reference material. Not user-facing.</p>
      <div className="research-grid">
        {PLANS.map((p) => (
          <Link key={p.to} to={p.to} className="research-card">
            <div className="research-card-header">
              <span className="research-card-title">{p.title}</span>
              <span className="research-card-tag" style={{ color: TAG_COLORS[p.tag] ?? 'var(--muted-foreground)' }}>
                {p.tag}
              </span>
            </div>
            <p className="research-card-subtitle">{p.subtitle}</p>
            <p className="research-card-desc">{p.description}</p>
          </Link>
        ))}
      </div>
    </Page>
  );
}
