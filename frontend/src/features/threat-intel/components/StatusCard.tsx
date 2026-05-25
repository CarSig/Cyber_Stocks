import React from 'react';
import { Link } from 'react-router-dom';
import BaseCard from '@/components/common/cards/BaseCard';
import CardHeader from '@/components/common/cards/CardHeader';

type StatusCardProps = {
  to?: string;
  icon?: string;
  title: string;
  configured?: boolean;
  children?: React.ReactNode;
  syncedAt?: string | null;
};

export default function StatusCard({ to, icon, title, configured = true, children, syncedAt }: StatusCardProps) {
  const linkProps = to ? { to } : {};
  return (
    <BaseCard variant="interactive" as={to ? Link : 'div'} disabled={!to} {...linkProps}>
      <CardHeader icon={icon} title={title}>
        {!configured && <span className="ti-badge ti-badge--warn">Not configured</span>}
      </CardHeader>
      <div className="ti-card-body">{children}</div>
      {syncedAt && <span className="ti-synced">Synced {new Date(syncedAt).toLocaleString()}</span>}
    </BaseCard>
  );
}
