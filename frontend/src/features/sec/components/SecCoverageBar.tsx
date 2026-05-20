import { useSecCoverage } from '../hooks/useSecData';
import type { CoverageRange } from '../api';

type Props = {
  ticker: string | null;
};

function findGaps(ranges: CoverageRange[]): CoverageRange[] {
  const gaps: CoverageRange[] = [];
  for (let i = 0; i < ranges.length - 1; i++) {
    const gapFrom = nextDay(ranges[i].to);
    const gapTo = prevDay(ranges[i + 1].from);
    if (gapFrom <= gapTo) gaps.push({ from: gapFrom, to: gapTo });
  }
  return gaps;
}

function nextDay(d: string) {
  const dt = new Date(d);
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

function prevDay(d: string) {
  const dt = new Date(d);
  dt.setUTCDate(dt.getUTCDate() - 1);
  return dt.toISOString().slice(0, 10);
}

export default function SecCoverageBar({ ticker }: Props) {
  const { data } = useSecCoverage(ticker);

  if (!ticker || !data || data.ranges.length === 0) return null;

  const gaps = findGaps(data.ranges);

  return (
    <div className="sec-section">
      <h2 className="sec-section-title">Downloaded Coverage — {ticker}</h2>
      <div className="sec-coverage">
        <div className="sec-coverage-rows">
          {data.ranges.map((r) => (
            <div key={r.from} className="sec-coverage-row sec-coverage-covered">
              <span className="sec-coverage-label">Covered</span>
              <span className="sec-coverage-range">
                {r.from} → {r.to}
              </span>
            </div>
          ))}
          {gaps.map((g) => (
            <div key={g.from} className="sec-coverage-row sec-coverage-gap">
              <span className="sec-coverage-label">Gap</span>
              <span className="sec-coverage-range">
                {g.from} → {g.to}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
