import { useCyberNewsSummary } from '@/features/news/hooks/useCyberNews';
import SummaryListRow from '@/components/common/data-display/SummaryListRow';
import type { CyberNewsTicker, CorrelationResult } from '@/types';

type TickerListRowProps = {
  row: CyberNewsTicker;
  onClick?: () => void;
  topic?: string;
  correlation?: { result?: CorrelationResult | { error: string } };
};

export default function TickerListRow({ row, onClick, topic, correlation }: TickerListRowProps) {
  const { data: summary, isPending } = useCyberNewsSummary(row.ticker, topic);
  return (
    <SummaryListRow
      title={row.company}
      subtitle={row.ticker}
      summary={summary ?? undefined}
      isPending={isPending}
      correlation={correlation}
      onClick={onClick}
    />
  );
}
