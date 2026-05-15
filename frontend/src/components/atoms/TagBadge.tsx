import React from 'react';
import { Badge } from '@/components/ui/badge';

type TagBadgeProps = {
  children?: React.ReactNode;
  color?: string;
  bg?: string;
  className?: string;
};

export default function TagBadge({ children, color, bg, className }: TagBadgeProps) {
  return (
    <Badge
      variant="outline"
      style={{ ...(color && { color, borderColor: color }), ...(bg && { background: bg }) }}
      className={`text-[10px] px-1.5 ${className ?? ''}`}
    >
      {children}
    </Badge>
  );
}
