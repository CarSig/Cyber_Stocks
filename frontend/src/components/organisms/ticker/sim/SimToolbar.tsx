import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SimToolbarProps = {
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
};

export default function SimToolbar({
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
}: SimToolbarProps) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', marginTop: '0.5rem' }}>
      <Select onValueChange={(v: string | null) => v && onPreset(v)} disabled={!presets}>
        <SelectTrigger className="w-44">
          <SelectValue
            placeholder={
              presetsError ? `Error: ${presetsError.message}` : presetsLoading ? 'Loading…' : 'Load preset…'
            }
          />
        </SelectTrigger>
        <SelectContent>
          {presets && Object.keys(presets).map((name) => (
            <SelectItem key={name} value={name}>{name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="ghost" onClick={onTextModeToggle}>
        {textMode ? 'Visual editor' : 'Text editor'}
      </Button>
      {hasResult && <Button variant="ghost" onClick={onExportPdf}>Export PDF</Button>}
      {hasActions && <Button variant="ghost" onClick={onClear}>Clear</Button>}
    </div>
  );
}
