import Simulation from "@/components/organisms/ticker/Simulation.jsx";

export default function SimulationTab({ ticker, allQuotes, onResult }) {
  return (
    <section>
      <Simulation ticker={ticker} quotes={allQuotes} onResult={onResult} />
    </section>
  );
}
