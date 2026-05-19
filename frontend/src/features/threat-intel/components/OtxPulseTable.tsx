import React from 'react';
import TiTable from './TiTable';
import OtxPulseRow from './OtxPulseRow';
import type { ThreatIntelListResponse } from '@/types';

const HEADERS = ['Pulse', 'Tags', 'Indicators', 'TLP', 'Created'];

type OtxPulse = {
  id: string;
  name?: string;
  tags?: string[];
  indicators_count?: number;
  tlp?: string;
  created?: string;
};

type OtxPulseTableProps = {
  data?: ThreatIntelListResponse;
};

export default function OtxPulseTable({ data }: OtxPulseTableProps) {
  return (
    <TiTable<OtxPulse>
      headers={HEADERS}
      items={data?.items as OtxPulse[] | undefined}
      renderRow={(p) => <OtxPulseRow key={p.id} pulse={p} />}
      rowKey={(p) => p.id}
    />
  );
}
