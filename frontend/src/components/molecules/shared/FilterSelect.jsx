import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function FilterSelect({ value, onChange, placeholder, options, allLabel = "All", showAll = true }) {
  const normalized = options.map((o) => typeof o === "string" ? { label: o, value: o } : o);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {showAll && <SelectItem value="">{allLabel} {placeholder.toLowerCase()}</SelectItem>}
        {normalized.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
