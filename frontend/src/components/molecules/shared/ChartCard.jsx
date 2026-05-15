import ChartToggleButton from '@/components/atoms/ChartToggleButton.jsx';

export default function ChartCard({ title, hidden, onToggle, children }) {
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
