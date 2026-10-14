"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DEFAULT_CURRENCY } from "@/utils/constant";

interface MoneyInputProps {
  id?: string;
  /** What the person typed, in major units ("1,900.50"). Convert with majorToMinor() on submit. */
  value: string;
  onChange: (value: string) => void;
  currency?: string;
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
}

const SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

/** Text box with a currency prefix. Keeps only digits, one decimal point and two decimals. */
export function MoneyInput({
  id,
  value,
  onChange,
  currency = DEFAULT_CURRENCY,
  placeholder = "0.00",
  invalid,
  disabled,
  className,
}: MoneyInputProps) {
  function sanitize(raw: string): string {
    const cleaned = raw.replace(/[^\d.]/g, "");
    const [whole, ...rest] = cleaned.split(".");
    if (rest.length === 0) return whole;
    return `${whole}.${rest.join("").slice(0, 2)}`;
  }

  return (
    <div className={cn("relative", className)}>
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[0.8125rem] text-ink-3">
        {SYMBOLS[currency] ?? currency}
      </span>
      <Input
        id={id}
        value={value}
        inputMode="decimal"
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={invalid}
        onChange={(event) => onChange(sanitize(event.target.value))}
        className="t-figure h-9 bg-card pl-8 text-right"
      />
    </div>
  );
}
