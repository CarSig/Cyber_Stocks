import React from 'react';

type TiTableProps<T> = {
  headers: string[];
  items?: T[];
  renderRow: (item: T, key: string | number) => React.ReactNode;
  rowKey: (item: T) => string | number;
};

export default function TiTable<T>({ headers, items, renderRow, rowKey }: TiTableProps<T>) {
  return (
    <div className="ti-table-wrap">
      <table className="ti-table">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{items?.map((item) => renderRow(item, rowKey(item)))}</tbody>
      </table>
    </div>
  );
}
