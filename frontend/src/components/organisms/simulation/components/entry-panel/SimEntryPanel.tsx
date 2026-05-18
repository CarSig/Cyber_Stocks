import type { RefObject } from 'react';
import { Textarea } from '@/components/ui/textarea';
import Toolbar from './Toolbar';
import ManualEntry from './ManualEntry';
import ActionTable from './ActionTable';
import Results from './Results';
import type { AnyTransaction } from './TransactionTable';
import type { MarkerPoint } from '@/components/organisms/charts/utils/types';
import type { SimStrategy } from '../../reducers/baseStrategy';

type StatItem = { label: string; value: string; color?: string };

type ActionRow = Record<string, unknown> & { id: number; value: number | string; side: string };

type SimEntryPanelProps<A extends ActionRow> = {
  topSlot?: React.ReactNode;
  tradeMode: 'long' | 'short';
  strategy: SimStrategy<A>;

  // Toolbar
  presets: Record<string, unknown> | undefined;
  onPreset: (name: string) => void;
  textMode: boolean;
  onTextModeToggle: () => void;
  onExportPdf: () => void;
  onClear: () => void;
  presetsLoading?: boolean;
  presetsError?: Error | null;
  /** AI simulation props — only used by IntradaySimulation */
  ai?: {
    onAiSim: () => void;
    aiSimDisabled?: boolean;
    onSimulateAll?: () => void;
    aiDelay?: number;
    onAiDelayChange?: (v: number) => void;
  };

  // ManualEntry
  nextSide: string;
  onNextSideChange: (s: string) => void;
  manualValue: string;
  onManualValueChange: (v: string) => void;
  onAddManual: () => void;
  /** "time" for intraday/daytrade, "date" for long-term simulation */
  manualInputType: 'time' | 'date';
  /** Current value of the time/date input */
  manualInputValue: string;
  /** Called when the time/date input changes */
  onManualInputChange: (v: string) => void;
  /** Min date (only used when manualInputType='date') */
  manualMinDate?: string;
  /** Max date (only used when manualInputType='date') */
  manualMaxDate?: string;

  // Textarea
  textValue: string;
  onTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;

  // ActionTable
  actions: A[];
  actionLabelSlot?: (action: A, index: number) => React.ReactNode;
  onUpdateAction: (id: number, field: 'side' | 'value', val: string) => void;
  onRemoveAction: (id: number) => void;

  // Results
  resultStats: StatItem[] | null;
  resultHistory: { time: string; value: number }[];
  resultMarkers: MarkerPoint[];
  resultTransactions: AnyTransaction[] | null;
  portfolioChartRef: RefObject<HTMLDivElement | null>;
};

export default function SimEntryPanel<A extends ActionRow>({
  topSlot,
  tradeMode,
  strategy,
  presets,
  onPreset,
  textMode,
  onTextModeToggle,
  onExportPdf,
  onClear,
  presetsLoading,
  presetsError,
  ai,
  nextSide,
  onNextSideChange,
  manualValue,
  onManualValueChange,
  onAddManual,
  manualInputType,
  manualInputValue,
  onManualInputChange,
  manualMinDate,
  manualMaxDate,
  textValue,
  onTextChange,
  actions,
  actionLabelSlot,
  onUpdateAction,
  onRemoveAction,
  resultStats,
  resultHistory,
  resultMarkers,
  resultTransactions,
  portfolioChartRef,
}: SimEntryPanelProps<A>) {
  const sideOptions =
    tradeMode === 'long'
      ? [
          { value: 'buy', label: 'Buy ($)' },
          { value: 'sell', label: 'Sell (%)' },
        ]
      : [
          { value: 'short', label: 'Short ($)' },
          { value: 'cover', label: 'Cover (%)' },
        ];

  const hasResult = resultStats !== null;
  const hasActions = actions.length > 0;
  const defaultLabelSlot = (a: A) => strategy.getLabel(a);
  const labelSlot = actionLabelSlot ?? defaultLabelSlot;

  return (
    <div>
      {topSlot}

      <Toolbar
        presets={presets}
        presetsLoading={presetsLoading}
        presetsError={presetsError}
        onPreset={onPreset}
        textMode={textMode}
        onTextModeToggle={onTextModeToggle}
        hasResult={hasResult}
        onExportPdf={onExportPdf}
        hasActions={hasActions}
        onClear={onClear}
        onAiSim={ai?.onAiSim}
        aiSimDisabled={ai?.aiSimDisabled}
        onSimulateAll={ai?.onSimulateAll}
        aiDelay={ai?.aiDelay}
        onAiDelayChange={ai?.onAiDelayChange}
      />

      <ManualEntry
        side={nextSide}
        onSideChange={onNextSideChange}
        sideOptions={sideOptions}
        value={manualValue}
        onValueChange={onManualValueChange}
        onAdd={onAddManual}
        inputType={manualInputType}
        inputValue={manualInputValue}
        onInputChange={onManualInputChange}
        minDate={manualMinDate}
        maxDate={manualMaxDate}
      />

      {textValue && textMode && (
        <Textarea
          value={textValue}
          onChange={onTextChange}
          placeholder={strategy.getTextPlaceholder()}
          rows={strategy.getTextRows(actions.length)}
          className="sim-textarea"
        />
      )}

      {!textMode && hasActions && (
        <ActionTable
          actions={actions}
          tradeMode={tradeMode}
          labelSlot={labelSlot}
          sortKey={strategy.getSortKey}
          onUpdate={onUpdateAction}
          onRemove={onRemoveAction}
        />
      )}

      {resultStats && resultTransactions && (
        <Results
          ref={portfolioChartRef}
          stats={resultStats}
          history={resultHistory}
          markers={resultMarkers}
          transactions={resultTransactions}
          intraday={strategy.isIntraday}
        />
      )}
    </div>
  );
}
