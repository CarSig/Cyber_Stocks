import type { ChartPlugin } from '@/features/charts/core';
import type { SecFileListing } from '../api';
import { buildFilingMarkers, getFormStyle } from '../utils';

const EDGAR_ARCHIVES = 'https://www.sec.gov/Archives/edgar/data';

type SecFilingsOverlayOpts = {
  filings: SecFileListing[];
  /** Plugin id. Override if you need multiple filing overlays on one chart. */
  id?: string;
  label?: string;
  defaultEnabled?: boolean;
};

function filingUrl(f: SecFileListing): string | undefined {
  if (!f.cik) return undefined;
  const accNoDashes = f.accession.replace(/-/g, '');
  const base = `${EDGAR_ARCHIVES}/${f.cik}/${accNoDashes}`;
  return f.primaryDoc ? `${base}/${f.primaryDoc}` : `${base}/`;
}

/**
 * Sec EDGAR filing markers — one dot per filing, colored by form type.
 * Click a marker → modal listing the filings on that day with links to the
 * primary document on edgar.sec.gov.
 */
export function secFilingsOverlay({
  filings,
  id = 'sec-filings',
  label = 'Filings',
  defaultEnabled = false,
}: SecFilingsOverlayOpts): ChartPlugin {
  // Content hash so the engine remounts when filings change for the same id
  // (e.g. ticker switch, new sync). See ChartPlugin.version.
  const first = filings[0];
  const last = filings[filings.length - 1];
  const version = `${filings.length}|${first?.accession ?? ''}|${last?.accession ?? ''}`;

  // Index filings by date for fast click lookup.
  const byDate = new Map<string, SecFileListing[]>();
  for (const f of filings) {
    if (!f.date) continue;
    const key = f.date.slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(f);
  }

  return {
    id,
    label,
    defaultEnabled,
    version,
    mount: (ctrl) => {
      ctrl.setMarkers(id, buildFilingMarkers(filings));
      return { unmount: () => ctrl.setMarkers(id, []) };
    },
    onMarkerClick: ({ date }) => {
      const items = byDate.get(date);
      if (!items?.length) return null;
      return {
        title: `SEC Filings — ${date}`,
        body: (
          <div className="sec-filings-modal-list">
            {items.map((f) => {
              const { color } = getFormStyle(f.form);
              const url = filingUrl(f);
              const inner = (
                <>
                  <span className="sec-legend-swatch" style={{ background: color }} />
                  <span className="sec-filings-modal-form">{f.form ?? '?'}</span>
                  <span className="sec-filings-modal-acc">{f.accession}</span>
                </>
              );
              return url ? (
                <a
                  key={f.accession}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="sec-filings-modal-row"
                >
                  {inner}
                </a>
              ) : (
                <div key={f.accession} className="sec-filings-modal-row">
                  {inner}
                </div>
              );
            })}
          </div>
        ),
      };
    },
  };
}
