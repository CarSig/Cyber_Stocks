import OtxPulseRow from "./OtxPulseRow.jsx";

export default function OtxPulseTable({ data }) {
  return (
    <div className="ti-table-wrap">
      <table className="ti-table">
        <thead>
          <tr>
            <th>Pulse</th>
            <th>Tags</th>
            <th>Indicators</th>
            <th>TLP</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {data?.items?.map((p) => (
            <OtxPulseRow key={p.id} pulse={p} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
