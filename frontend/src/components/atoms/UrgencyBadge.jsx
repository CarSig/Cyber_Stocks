import TagBadge from './TagBadge';
import { URGENCY_CONFIG } from '@/utils/urgencyUtils.js';

export default function UrgencyBadge({ urgency }) {
  const cfg = URGENCY_CONFIG[urgency];
  return (
    <TagBadge color={cfg.color} bg={cfg.bg}>
      {cfg.label}
    </TagBadge>
  );
}
