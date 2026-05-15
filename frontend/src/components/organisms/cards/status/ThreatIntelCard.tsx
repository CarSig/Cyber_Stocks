import StatusCard from './StatusCard';
import StatusCardContent from './StatusCardContent';

type ThreatIntelData = {
  syncedAt?: string;
  count?: number;
  recentCount?: number;
  ransomwareCount?: number;
  fetched?: number;
  criticalCount?: number;
  highCount?: number;
  configured?: boolean;
};

type ThreatIntelCardProps = {
  to?: string;
  icon?: string;
  title: string;
  data?: ThreatIntelData;
  type: string;
  configured?: boolean;
};

export default function ThreatIntelCard({ to, icon, title, data, type, configured }: ThreatIntelCardProps) {
  return (
    <StatusCard to={to} icon={icon} title={title} configured={configured} syncedAt={data?.syncedAt}>
      <StatusCardContent data={data} type={type} />
    </StatusCard>
  );
}
