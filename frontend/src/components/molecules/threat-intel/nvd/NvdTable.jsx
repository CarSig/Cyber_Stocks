import TiTable from '../TiTable.jsx';
import NvdRow from './NvdRow.jsx';

const HEADERS = ['CVE ID', 'Severity', 'Score', 'Description', 'Published', 'Status'];

export default function NvdTable({ data }) {
  return (
    <TiTable
      headers={HEADERS}
      items={data?.items}
      renderRow={(cve) => <NvdRow key={cve.id} cve={cve} />}
      rowKey={(cve) => cve.id}
    />
  );
}
