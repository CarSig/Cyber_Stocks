import React from 'react';
import TiTable from '../TiTable';
import NvdRow from './NvdRow';
import type { ThreatIntelListResponse } from '@/types';

const HEADERS = ['CVE ID', 'Severity', 'Score', 'Description', 'Published', 'Status'];

type NvdCve = {
  id: string;
  severity?: string;
  score?: number | null;
  description?: string;
  published?: string;
  status?: string;
};

type NvdTableProps = {
  data?: ThreatIntelListResponse;
};

export default function NvdTable({ data }: NvdTableProps) {
  return (
    <TiTable<NvdCve>
      headers={HEADERS}
      items={data?.items as NvdCve[] | undefined}
      renderRow={(cve) => <NvdRow key={cve.id} cve={cve} />}
      rowKey={(cve) => cve.id}
    />
  );
}
