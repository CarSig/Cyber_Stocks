import StatusCard from "./StatusCard.jsx";
import StatusCardContent from "./StatusCardContent.jsx";

export default function ThreatIntelCard({ to, icon, title, data, type, configured }) {
  return (
    <StatusCard to={to} icon={icon} title={title} configured={configured} syncedAt={data?.syncedAt}>
      <StatusCardContent data={data} type={type} />
    </StatusCard>
  );
}
