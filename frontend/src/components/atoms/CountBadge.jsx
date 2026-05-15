import { Badge } from '@/components/ui/badge';

export default function CountBadge({ count, icon, className }) {
  return (
    <Badge variant="secondary" className={`text-[10px] px-1.5 ${className ?? ''}`}>
      {icon && <>{icon} </>}
      {count}
    </Badge>
  );
}
