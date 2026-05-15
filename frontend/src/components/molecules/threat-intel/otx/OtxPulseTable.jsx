import TiTable from "../TiTable.jsx";
import OtxPulseRow from "./OtxPulseRow.jsx";

const HEADERS = ["Pulse", "Tags", "Indicators", "TLP", "Created"];

export default function OtxPulseTable({ data }) {
  return <TiTable headers={HEADERS} items={data?.items} renderRow={(p) => <OtxPulseRow key={p.id} pulse={p} />} rowKey={(p) => p.id} />;
}
