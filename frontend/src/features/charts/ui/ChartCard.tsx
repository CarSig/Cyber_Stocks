import React from 'react';
import ChartToggleButton from './ChartToggleButton';

type ChartCardProps = {
  title?: React.ReactNode;
  hidden?: boolean;
  onToggle?: () => void;
  children?: React.ReactNode;
};

export default function ChartCard({ title, hidden, onToggle, children }: ChartCardProps) {
  return (
    <div className="chart-card">
      <div className="chart-title-row">
        <h3 className="chart-title">{title}</h3>
        <ChartToggleButton active={hidden} onClick={onToggle}>
          {hidden ? 'Show Chart' : 'Hide Chart'}
        </ChartToggleButton>
      </div>
      {!hidden && children}
    </div>
  );
}
