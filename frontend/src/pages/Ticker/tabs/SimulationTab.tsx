import { useState } from 'react';
import Simulation from '@/components/organisms/ticker/Simulation';
import DayTradeSimulation from '@/components/organisms/ticker/DayTradeSimulation';
import type { Quote, SimulationResult } from '@/types';

type SimulationTabProps = {
  ticker: string;
  allQuotes?: Quote[];
  onResult?: (result: SimulationResult) => void;
  companies?: Record<string, string>;
};

export default function SimulationTab({ ticker, allQuotes, onResult }: SimulationTabProps) {
  const [subtab, setSubtab] = useState<'longterm' | 'daytrade'>('longterm');

  return (
    <section>
      <div className="sim-subtabs">
        <button
          className={`sim-subtab${subtab === 'longterm' ? ' sim-subtab--active' : ''}`}
          onClick={() => setSubtab('longterm')}
          type="button"
        >
          Long term
        </button>
        <button
          className={`sim-subtab${subtab === 'daytrade' ? ' sim-subtab--active' : ''}`}
          onClick={() => setSubtab('daytrade')}
          type="button"
        >
          Day trade
        </button>
      </div>

      {subtab === 'longterm' && (
        <Simulation
          ticker={ticker}
          quotes={allQuotes}
          onResult={onResult as Parameters<typeof Simulation>[0]['onResult']}
        />
      )}

      {subtab === 'daytrade' && <DayTradeSimulation ticker={ticker} />}
    </section>
  );
}
