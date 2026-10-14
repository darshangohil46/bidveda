"use client";

import PhoneInput, { type Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { cn } from "@/lib/utils";
import { DEFAULT_COUNTRY_ISO } from "@/utils/constant";

interface PhoneFieldProps {
  id?: string;
  /** E.164, e.g. +919876543210. Empty string when nothing is entered. */
  value: string;
  onChange: (value: string) => void;
  defaultCountry?: Country;
  disabled?: boolean;
  invalid?: boolean;
  className?: string;
}

/** Phone number with a country-code picker, stored as E.164 so it is unambiguous everywhere. */
export function PhoneField({
  id,
  value,
  onChange,
  defaultCountry = DEFAULT_COUNTRY_ISO as Country,
  disabled,
  invalid,
  className,
}: PhoneFieldProps) {
  return (
    <PhoneInput
      id={id}
      international
      countryCallingCodeEditable={false}
      defaultCountry={defaultCountry}
      value={value || undefined}
      onChange={(next) => onChange(next ?? "")}
      disabled={disabled}
      limitMaxLength
      aria-invalid={invalid}
      className={cn(invalid && "[&_.PhoneInputInput]:border-rust", className)}
    />
  );
}
