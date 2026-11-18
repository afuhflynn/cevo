"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";

/**
 * shadcn single-select for admin filter bars. Empty string means "no
 * filter"; Radix forbids empty-string item values, so it is aliased to
 * a sentinel internally and translated back on change.
 */
export function FilterSelect({
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (next: string) => void;
  placeholder: string;
}) {
  return (
    <Select
      value={value === "" ? ALL : value}
      onValueChange={(v: string | null) =>
        onChange(v === ALL || v === null ? "" : v)
      }
    >
      <SelectTrigger aria-label={label} className="w-fit min-w-40">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
