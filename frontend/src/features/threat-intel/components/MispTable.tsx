import React from 'react';
import TiTable from './TiTable';
import MispRow from './MispRow';
import type { ThreatIntelListResponse, ThreatIntelItem } from '@/types';

const HEADERS = ['Event', 'Org', 'Threat Level', 'Date'];

type MispItem = ThreatIntelItem & { Event?: { uuid?: string; id?: string } };

type MispTableProps = {
  data?: ThreatIntelListResponse;
};

export default function MispTable({ data }: MispTableProps) {
  return (
    <TiTable<MispItem>
      headers={HEADERS}
      items={data?.items as MispItem[] | undefined}
      renderRow={(item) => <MispRow key={(item.Event?.uuid ?? item.uuid ?? item.id) as string} item={item} />}
      rowKey={(item) => (item.Event?.uuid ?? item.uuid ?? item.id ?? '') as string}
    />
  );
}
