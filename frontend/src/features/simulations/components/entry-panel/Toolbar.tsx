import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { aiButtonStyle } from '../../utils/styles';
import type { ExitStrategy } from '../../reducers/intradayReducer';

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
  simulateAllLabel?: string;
  onCombinationsAll?: () => void;
  aiDelay?: number;
  onAiDelayChange?: (v: number) => void;
  exitStrategy?: ExitStrategy;
  onExitStrategyChange?: (v: ExitStrategy) => void;
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
  simulateAllLabel,
  onCombinationsAll,
  aiDelay,
  onAiDelayChange,
  exitStrategy,
  onExitStrategyChange,
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
          {onExitStrategyChange !== undefined && (
            <Select value={exitStrategy ?? '15:45'} onValueChange={(v) => onExitStrategyChange(v as ExitStrategy)}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Exit strategy…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15:45">Exit 15:45</SelectItem>
                <SelectItem value="15:59">Exit 15:59</SelectItem>
                <SelectItem value="vol-same-day">Vol same day (ATR)</SelectItem>
                <SelectItem value="vol-next-day">Vol next day (2% move)</SelectItem>
                <SelectItem value="vol-hold">Vol hold 2× spike</SelectItem>
                <SelectItem value="vol-hold-3x">Vol hold 3× spike</SelectItem>
                <SelectItem value="vol-hold-eod">Vol hold EOD spike</SelectItem>
                <SelectItem value="vol-hold-vwap">Vol hold VWAP cross</SelectItem>
                <SelectItem value="vol-hold-confirm">Vol hold price+vol confirm</SelectItem>
                <SelectItem value="vol-trail">Vol trailing ATR stop</SelectItem>
                <SelectItem value="vol-staged">Vol staged scale-out</SelectItem>
              </SelectContent>
            </Select>
          )}
        </>
      )}
      {onSimulateAll && (
        <Button variant="ghost" onClick={onSimulateAll} style={aiButtonStyle}>
          ✦ {simulateAllLabel ?? 'Simulate All'}
        </Button>
      )}
      {onCombinationsAll && (
        <Button variant="ghost" onClick={onCombinationsAll} style={aiButtonStyle}>
          ✦ All Combinations
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
