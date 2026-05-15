import { useCyberNewsSummary } from '@/hooks/useCyberNews.js';
import { sentimentLabel, correlationStrength } from '@/utils/sentimentUtils.js';
import TickerStats from './TickerStats.jsx';
import './TickerListRow.css';

export default function TickerListRow({ row, onClick, topic, correlation }) {
  const { data: summary, isPending } = useCyberNewsSummary(row.ticker, topic);
  const corrResult = correlation?.result;
  const hasCorrelation = corrResult && !('error' in corrResult);
  const strength = hasCorrelation ? correlationStrength(corrResult.r) : null;
  const sentimentInfo = summary ? sentimentLabel(summary.avgSentiment) : null;

  return (
    <div onClick={onClick} className={`ticker-list-row list-row-card ${isPending ? 'loading' : ''}`}>
      <div className="ticker-list-row-info">
        <div className="ticker-list-row-company">{row.company}</div>
        <div className="ticker-list-row-ticker">{row.ticker}</div>
      </div>

      {isPending ? (
        <div className="ticker-list-row-empty">Loading…</div>
      ) : summary ? (
        <TickerStats
          summary={summary}
          sentimentInfo={sentimentInfo}
          hasCorrelation={hasCorrelation}
          strength={strength}
          corrResult={corrResult}
        />
      ) : (
        <div className="ticker-list-row-empty">No data</div>
      )}
    </div>
  );
}
