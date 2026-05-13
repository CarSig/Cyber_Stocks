import { Badge } from "@/components/ui/badge";

export default function TagBadge({ children, color, bg, className }) {
  return (
    <Badge
      variant="outline"
      style={{ ...(color && { color, borderColor: color }), ...(bg && { background: bg }) }}
      className={`text-[10px] px-1.5 ${className ?? ""}`}
    >
      {children}
    </Badge>
  );
}
