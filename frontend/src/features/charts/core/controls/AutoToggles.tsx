import { useChartContext } from '../ChartContext';
import ChartToggleButton from '../../ui/ChartToggleButton';

/**
 * Auto-renders a toggle button for every plugin that has a `label`.
 * Used by ChartAuto. Plugins without a label are hidden (intentional — that's
 * how you opt out of UI for always-on plugins like a base compare overlay).
 */
export function AutoToggles() {
  const { plugins, enabled, toggle } = useChartContext('Chart.AutoToggles');
  return (
    <>
      {plugins
        .filter((p) => p.label)
        .map((p) => (
          <ChartToggleButton
            key={p.id}
            active={enabled[p.id] ?? p.defaultEnabled ?? true}
            onClick={() => toggle(p.id)}
          >
            {p.label}
          </ChartToggleButton>
        ))}
    </>
  );
}
