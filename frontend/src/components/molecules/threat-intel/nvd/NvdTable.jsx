import NvdRow from "./NvdRow.jsx";

export default function NvdTable({ data }) {
  return (
    <div className="ti-table-wrap">
      <table className="ti-table">
        <thead>
          <tr>
            <th>CVE ID</th>
            <th>Severity</th>
            <th>Score</th>
            <th>Description</th>
            <th>Published</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data?.items?.map((cve) => (
            <NvdRow key={cve.id} cve={cve} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
