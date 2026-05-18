import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { aiButtonStyle } from '../../utils/styles';

type ToolbarProps = {
  presets: Record<string, unknown> | undefined;
  presetsLoading?: boolean;
  presetsError?: Error | null;
  onPreset: (name: string) => void;
  textMode: boolean;
  onTextModeToggle: () => void;
  hasResult: boolean;
  onExportPdf: () => void;
  hasActions: boolean;
  onClear: () => void;
  onAiSim?: () => void;
  aiSimDisabled?: boolean;
  onSimulateAll?: () => void;
  aiDelay?: number;
  onAiDelayChange?: (v: number) => void;
};

export default function Toolbar({
  presets,
  presetsLoading,
  presetsError,
  onPreset,
  textMode,
  onTextModeToggle,
  hasResult,
  onExportPdf,
  hasActions,
  onClear,
  onAiSim,
  aiSimDisabled,
  onSimulateAll,
  aiDelay,
  onAiDelayChange,
}: ToolbarProps) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
      <Select onValueChange={(v: string | null) => v && onPreset(v)} disabled={!presets}>
        <SelectTrigger className="w-44">
          <SelectValue
            placeholder={presetsError ? `Error: ${presetsError.message}` : presetsLoading ? 'Loading…' : 'Load preset…'}
          />
        </SelectTrigger>
        <SelectContent>
          {presets &&
            Object.keys(presets).map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      <Button variant="ghost" onClick={onTextModeToggle}>
        {textMode ? 'Visual editor' : 'Text editor'}
      </Button>
      {(onAiSim !== undefined || aiDelay !== undefined) && (
        <>
          <Button
            variant="ghost"
            onClick={onAiSim}
            disabled={aiSimDisabled}
            style={aiSimDisabled ? undefined : aiButtonStyle}
          >
            ✦ AI Simulation
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <Input
              type="number"
              min={0}
              max={60}
              value={aiDelay ?? 1}
              onChange={(e) => onAiDelayChange?.(Math.max(0, Number(e.target.value)))}
              style={{ width: 82, textAlign: 'center' }}
              className="dtrade-shares-input"
            />
            <span style={{ fontSize: 12, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>min delay</span>
          </div>
        </>
      )}
      {onSimulateAll && (
        <Button variant="ghost" onClick={onSimulateAll} style={aiButtonStyle}>
          ✦ Simulate All
        </Button>
      )}
      {hasResult && (
        <Button variant="ghost" onClick={onExportPdf}>
          Export PDF
        </Button>
      )}
      {hasActions && (
        <Button variant="ghost" onClick={onClear}>
          Clear
        </Button>
      )}
    </div>
  );
}
