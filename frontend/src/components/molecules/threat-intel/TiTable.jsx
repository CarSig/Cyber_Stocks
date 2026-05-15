export default function TiTable({ headers, items, renderRow, rowKey }) {
  return (
    <div className="ti-table-wrap">
      <table className="ti-table">
        <thead>
          <tr>{headers.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>{items?.map((item) => renderRow(item, rowKey(item)))}</tbody>
      </table>
    </div>
  );
}
