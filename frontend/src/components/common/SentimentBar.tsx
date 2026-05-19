import { sentimentColor } from '@/utils/sentimentUtils';

type SentimentBarProps = {
  value: number;
};

export default function SentimentBar({ value }: SentimentBarProps) {
  const pct = Math.round(((value + 1) / 2) * 100);
  return (
    <div className="sentiment-bar">
      <div className="sentiment-bar-track">
        <div className="sentiment-bar-fill" style={{ width: `${pct}%`, background: sentimentColor(value) }} />
      </div>
      <span className="sentiment-bar-value" style={{ color: sentimentColor(value) }}>
        {value > 0 ? '+' : ''}
        {value.toFixed(2)}
      </span>
    </div>
  );
}
