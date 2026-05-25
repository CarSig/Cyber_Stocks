import type { RefObject } from 'react';
import { Textarea } from '@/components/ui/textarea';
import Toolbar from './Toolbar';
import ManualEntry from './ManualEntry';
import ActionTable from './ActionTable';
import Results from './Results';
import type { AnyTransaction } from './TransactionTable';
import type { MarkerPoint } from '@/features/charts/types';
import type { SimStrategy, BuiltToolbar, BuiltManual, BuiltActions } from '../../reducers/baseStrategy';

type StatItem = { label: string; value: string; color?: string };

type ActionRow = Record<string, unknown> & { id: number; value: number | string; side: string };

type ResultProps = {
  stats: StatItem[] | null;
  history: { time: string; value: number }[];
  markers: MarkerPoint[];
  transactions: AnyTransaction[] | null;
  chartRef: RefObject<HTMLDivElement | null>;
};

type SimEntryPanelProps<A extends ActionRow> = {
  topSlot?: React.ReactNode;
  tradeMode: 'long' | 'short';
  strategy: SimStrategy<A>;
  textValue: string;
  onTextChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  toolbar: BuiltToolbar;
  manual: BuiltManual;
  actions: BuiltActions<A>;
  result: ResultProps;
};

export default function SimEntryPanel<A extends ActionRow>({
  topSlot,
  tradeMode,
  strategy,
  textValue,
  onTextChange,
  toolbar,
  manual,
  actions,
  result,
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

  const hasResult = result.stats !== null;
  const hasActions = actions.list.length > 0;
  const labelSlot = actions.labelSlot ?? ((a: A) => strategy.getLabel(a));

  return (
    <div>
      {topSlot}

      <Toolbar
        presets={toolbar.presets}
        presetsLoading={toolbar.presetsLoading}
        presetsError={toolbar.presetsError}
        onPreset={toolbar.onPreset}
        textMode={toolbar.textMode}
        onTextModeToggle={toolbar.onTextModeToggle}
        hasResult={hasResult}
        onExportPdf={toolbar.onExportPdf}
        hasActions={hasActions}
        onClear={toolbar.onClear}
        onAiSim={toolbar.ai?.onAiSim}
        aiSimDisabled={toolbar.ai?.aiSimDisabled}
        onSimulateAll={toolbar.ai?.onSimulateAll}
        simulateAllLabel={toolbar.ai?.simulateAllLabel}
        onCombinationsAll={toolbar.ai?.onCombinationsAll}
        aiDelay={toolbar.ai?.aiDelay}
        onAiDelayChange={toolbar.ai?.onAiDelayChange}
        exitStrategy={toolbar.ai?.exitStrategy}
        onExitStrategyChange={toolbar.ai?.onExitStrategyChange}
      />

      <ManualEntry
        side={manual.nextSide}
        onSideChange={manual.onNextSideChange}
        sideOptions={sideOptions}
        value={manual.value}
        onValueChange={manual.onValueChange}
        onAdd={manual.onAdd}
        inputType={manual.inputType}
        inputValue={manual.inputValue}
        onInputChange={manual.onInputChange}
        minDate={manual.minDate}
        maxDate={manual.maxDate}
      />

      {textValue && toolbar.textMode && (
        <Textarea
          value={textValue}
          onChange={onTextChange}
          placeholder={strategy.getTextPlaceholder()}
          rows={strategy.getTextRows(actions.list.length)}
          className="sim-textarea"
        />
      )}

      {!toolbar.textMode && hasActions && (
        <ActionTable
          actions={actions.list}
          tradeMode={tradeMode}
          labelSlot={labelSlot}
          sortKey={strategy.getSortKey}
          onUpdate={actions.onUpdate}
          onRemove={actions.onRemove}
        />
      )}

      {result.stats && result.transactions && (
        <Results
          ref={result.chartRef}
          stats={result.stats}
          history={result.history}
          markers={result.markers}
          transactions={result.transactions}
          intraday={strategy.isIntraday}
        />
      )}
    </div>
  );
}
