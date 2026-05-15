import TagBadge from './TagBadge';
import { URGENCY_CONFIG } from '@/utils/urgencyUtils';
import type { UrgencyKey } from '@/types';

type UrgencyBadgeProps = {
  urgency: UrgencyKey;
};

export default function UrgencyBadge({ urgency }: UrgencyBadgeProps) {
  const cfg = URGENCY_CONFIG[urgency];
  return (
    <TagBadge color={cfg.color} bg={cfg.bg}>
      {cfg.label}
    </TagBadge>
  );
}
