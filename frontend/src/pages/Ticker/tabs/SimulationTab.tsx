import Simulation from '@/components/organisms/ticker/Simulation';
import type { Quote, SimulationResult } from '@/types';

type SimulationTabProps = {
  ticker: string;
  allQuotes?: Quote[];
  onResult?: (result: SimulationResult) => void;
};

export default function SimulationTab({ ticker, allQuotes, onResult }: SimulationTabProps) {
  return (
    <section>
      <Simulation ticker={ticker} quotes={allQuotes} onResult={onResult as Parameters<typeof Simulation>[0]['onResult']} />
    </section>
  );
}
