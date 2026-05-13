import MispRow from "./MispRow.jsx";

export default function MispTable({ data }) {
  return (
    <div className="ti-table-wrap">
      <table className="ti-table">
        <thead>
          <tr>
            <th>Event</th>
            <th>Org</th>
            <th>Threat Level</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {data?.items?.map((item) => (
            <MispRow key={item.Event?.uuid ?? item.uuid ?? item.id} item={item} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
