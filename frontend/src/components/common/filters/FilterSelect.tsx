import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

type FilterOption = string | { label: string; value: string };

type FilterSelectProps = {
  value?: string | null;
  onChange?: (value: string | null) => void;
  placeholder: string;
  options: FilterOption[];
  allLabel?: string;
  showAll?: boolean;
  className?: string;
};

export default function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
  allLabel = 'All',
  showAll = true,
  className = 'w-40',
}: FilterSelectProps) {
  const normalized = options.map((o) => (typeof o === 'string' ? { label: o, value: o } : o));
  return (
    <Select value={value ?? undefined} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {showAll && (
          <SelectItem value="">
            {allLabel} {placeholder.toLowerCase()}
          </SelectItem>
        )}
        {normalized.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
