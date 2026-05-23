import type { ReactNode } from 'react';
import { useChartContext } from '../ChartContext';
import ChartToggleButton from '../../ui/ChartToggleButton';

type ToggleProps = {
  pluginId: string;
  children?: ReactNode;
};

/**
 * Manual toggle for a specific plugin by id. Used in ChartManual where the
 * consumer lays out the toolbar themselves. Falls back to plugin.label as the
 * button text if no children are provided.
 */
export function Toggle({ pluginId, children }: ToggleProps) {
  const { plugins, enabled, toggle } = useChartContext('Chart.Toggle');
  const plugin = plugins.find((p) => p.id === pluginId);
  if (!plugin) {
    console.warn(`<Chart.Toggle pluginId="${pluginId}"> — no plugin with that id`);
    return null;
  }
  return (
    <ChartToggleButton active={enabled[pluginId] ?? plugin.defaultEnabled ?? true} onClick={() => toggle(pluginId)}>
      {children ?? plugin.label ?? pluginId}
    </ChartToggleButton>
  );
}
