import type { RefObject } from 'react';
import { Textarea } from '@/components/ui/textarea';
import Toolbar from './Toolbar';
import ManualEntry from './ManualEntry';
import ActionTable from './ActionTable';
import Results from './Results';
import type { AnyTransaction } from './TransactionTable';
import type { MarkerPoint } from '@/components/organisms/charts/utils/types';

type StatItem = { label: string; value: string; color?: string };

type ActionRow = { id: number; side: string; value: number | string };

type SimEntryPanelProps<A extends ActionRow> = {
  topSlot?: React.ReactNode;

  tradeMode: 'long' | 'short';

  // Toolbar
  presets: Record<string, unknown> | undefined;
  onPreset: (name: string) => void;
  textMode: boolean;
  onTextModeToggle: () => void;
  hasResult: boolean;
  onExportPdf: () => void;
  hasActions: boolean;
  onClear: () => void;
  presetsLoading?: boolean;
  presetsError?: Error | null;
  onAiSim?: () => void;
  aiSimDisabled?: boolean;
  onSimulateAll?: () => void;
  aiDelay?: number;
  onAiDelayChange?: (v: number) => void;

  // ManualEntry
  nextSide: string;
  onNextSideChange: (s: string) => void;
  manualValue: string;
  onManualValueChange: (v: string) => void;
  onAddManual: () => void;
  manualInputSlot: React.ReactNode;

  // Textarea
  textValue: string;
  onTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  textPlaceholder: string;
  textRows: number;

  // ActionTable
  actions: A[];
  actionLabelSlot: (action: A, index: number) => React.ReactNode;
  onUpdateAction: (id: number, field: 'side' | 'value', val: string) => void;
  onRemoveAction: (id: number) => void;
  actionSortKey?: (action: A) => string;

  // Results
  resultStats: StatItem[] | null;
  resultHistory: { time: string; value: number }[];
  resultMarkers: MarkerPoint[];
  resultTransactions: AnyTransaction[] | null;
  portfolioChartRef: RefObject<HTMLDivElement | null>;
  intraday?: boolean;
};

export default function SimEntryPanel<A extends ActionRow>({
  topSlot,
  tradeMode,
  presets,
  onPreset,
  textMode,
  onTextModeToggle,
  hasResult,
  onExportPdf,
  hasActions,
  onClear,
  presetsLoading,
  presetsError,
  onAiSim,
  aiSimDisabled,
  onSimulateAll,
  aiDelay,
  onAiDelayChange,
  nextSide,
  onNextSideChange,
  manualValue,
  onManualValueChange,
  onAddManual,
  manualInputSlot,
  textValue,
  onTextChange,
  textPlaceholder,
  textRows,
  actions,
  actionLabelSlot,
  onUpdateAction,
  onRemoveAction,
  actionSortKey,
  resultStats,
  resultHistory,
  resultMarkers,
  resultTransactions,
  portfolioChartRef,
  intraday = false,
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
        onAiSim={onAiSim}
        aiSimDisabled={aiSimDisabled}
        onSimulateAll={onSimulateAll}
        aiDelay={aiDelay}
        onAiDelayChange={onAiDelayChange}
      />

      <ManualEntry
        side={nextSide}
        onSideChange={onNextSideChange}
        sideOptions={sideOptions}
        value={manualValue}
        onValueChange={onManualValueChange}
        onAdd={onAddManual}
        inputSlot={manualInputSlot}
      />

      {textMode && (
        <Textarea
          value={textValue}
          onChange={onTextChange}
          placeholder={textPlaceholder}
          rows={textRows}
          className="sim-textarea"
        />
      )}

      {!textMode && actions.length > 0 && (
        <ActionTable
          actions={actions}
          tradeMode={tradeMode}
          labelSlot={actionLabelSlot}
          sortKey={actionSortKey}
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
          intraday={intraday}
        />
      )}
    </div>
  );
}
