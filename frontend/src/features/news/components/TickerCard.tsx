import { useCyberNewsSummary } from '@/features/news/hooks/useCyberNews';
import SummaryCard from '@/components/common/data-display/SummaryCard';
import type { CyberNewsTicker, CorrelationResult } from '@/types';

type TickerCardProps = {
  row: CyberNewsTicker;
  onClick?: () => void;
  topic?: string;
  correlation?: { result?: CorrelationResult | { error: string } };
};

export default function TickerCard({ row, onClick, topic, correlation }: TickerCardProps) {
  const { data: summary, isPending } = useCyberNewsSummary(row.ticker, topic);
  return (
    <SummaryCard
      title={row.company}
      headerExtra={<span className="ticker-card-ticker">{row.ticker}</span>}
      summary={summary ?? undefined}
      isPending={isPending}
      correlation={correlation}
      onClick={onClick}
    />
  );
}
