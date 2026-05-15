import TiTable from '../TiTable.jsx';
import MispRow from './MispRow.jsx';

const HEADERS = ['Event', 'Org', 'Threat Level', 'Date'];

export default function MispTable({ data }) {
  return (
    <TiTable
      headers={HEADERS}
      items={data?.items}
      renderRow={(item) => <MispRow key={item.Event?.uuid ?? item.uuid ?? item.id} item={item} />}
      rowKey={(item) => item.Event?.uuid ?? item.uuid ?? item.id}
    />
  );
}
