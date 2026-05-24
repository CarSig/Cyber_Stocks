import type { ReactNode } from 'react';
import BaseCard from '@/components/common/BaseCard';
import ChartToggleButton from './ChartToggleButton';

type ChartCardProps = {
  title?: ReactNode;
  hidden?: boolean;
  onToggle?: () => void;
  children?: ReactNode;
};

export default function ChartCard({ title, hidden, onToggle, children }: ChartCardProps) {
  return (
    <BaseCard variant="article">
      <div className="chart-title-row">
        <h3 className="chart-title">{title}</h3>
        <ChartToggleButton active={hidden} onClick={onToggle}>
          {hidden ? 'Show Chart' : 'Hide Chart'}
        </ChartToggleButton>
      </div>
      {!hidden && children}
    </BaseCard>
  );
}
