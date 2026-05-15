import React from 'react';
import { Badge } from '@/components/ui/badge';

type CountBadgeProps = {
  count?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
};

export default function CountBadge({ count, icon, className }: CountBadgeProps) {
  return (
    <Badge variant="secondary" className={`text-[10px] px-1.5 ${className ?? ''}`}>
      {icon && <>{icon} </>}
      {count}
    </Badge>
  );
}
