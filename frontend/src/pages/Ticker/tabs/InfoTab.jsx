import { Button } from "@/components/ui/button";
import Summary from "@/components/organisms/ticker/Summary.jsx";

export default function InfoTab({ summary, research }) {
  return (
    <section>
      <Summary summary={summary} />
      <h2>Market Research</h2>
      <Button onClick={research.run} disabled={research.isPending} className="research-btn">
        {research.isPending ? "Researching…" : "Run Market Research"}
      </Button>
      {research.sections?.map((s, i) => (
        <div key={i} className="research-item">
          <h3 className="research-title">{s.title}</h3>
          <pre className="research-text">{s.text}</pre>
        </div>
      ))}
    </section>
  );
}
