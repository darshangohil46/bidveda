"use client";

import { useMemo } from "react";
import { City, Country, State } from "country-state-city";
import { FormField } from "@/components/common/FormField";
import { SearchSelect } from "@/components/common/SearchSelect";
import { Input } from "@/components/ui/input";
import { findCountryIso, validatePincode } from "@/lib/address";
import type { AddressErrors, AddressValue } from "@/types/address";

interface AddressFieldsProps {
  idPrefix?: string;
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  errors?: AddressErrors;
  /** Called when a field loses focus, so the form can validate early. */
  onBlurField?: (field: keyof AddressValue) => void;
}

/**
 * Country -> state -> city drop-downs backed by the `country-state-city` data set (no network),
 * plus a pincode checked against the selected country's postal format.
 * Countries or states the data set has no children for fall back to plain text inputs.
 */
export function AddressFields({
  idPrefix = "address",
  value,
  onChange,
  errors = {},
  onBlurField,
}: AddressFieldsProps) {
  const countries = useMemo(
    () =>
      Country.getAllCountries().map((country) => ({
        value: country.isoCode,
        label: country.name,
      })),
    [],
  );
  const countryIso = findCountryIso(value.country);

  const states = useMemo(
    () =>
      countryIso
        ? State.getStatesOfCountry(countryIso).map((state) => ({
            value: state.isoCode,
            label: state.name,
          }))
        : [],
    [countryIso],
  );
  const stateIso =
    states.find((state) => state.label === value.state)?.value ?? null;

  const cities = useMemo(() => {
    if (!countryIso) return [];
    const list = stateIso
      ? City.getCitiesOfState(countryIso, stateIso)
      : (City.getCitiesOfCountry(countryIso) ?? []);
    const unique = new Set(list.map((city) => city.name));
    return [...unique]
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ value: name, label: name }));
  }, [countryIso, stateIso]);

  const set = (patch: Partial<AddressValue>) =>
    onChange({ ...value, ...patch });
  const id = (field: string) => `${idPrefix}-${field}`;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <FormField
        label="Country"
        htmlFor={id("country")}
        required
        error={errors.country}
      >
        <SearchSelect
          id={id("country")}
          value={countryIso}
          selectedLabel={value.country}
          options={countries}
          placeholder="Select country"
          searchPlaceholder="Search countries"
          invalid={!!errors.country}
          onChange={(option) =>
            set({ country: option?.label ?? "", state: "", city: "" })
          }
        />
      </FormField>

      <FormField
        label="State / region"
        htmlFor={id("state")}
        required
        error={errors.state}
      >
        {states.length > 0 ? (
          <SearchSelect
            id={id("state")}
            value={stateIso}
            selectedLabel={value.state}
            options={states}
            placeholder="Select state"
            searchPlaceholder="Search states"
            invalid={!!errors.state}
            onChange={(option) => set({ state: option?.label ?? "", city: "" })}
          />
        ) : (
          <Input
            id={id("state")}
            value={value.state}
            disabled={!value.country}
            placeholder={
              value.country ? "State or region" : "Choose a country first"
            }
            aria-invalid={!!errors.state}
            onChange={(event) => set({ state: event.target.value })}
            onBlur={() => onBlurField?.("state")}
          />
        )}
      </FormField>

      <FormField label="City" htmlFor={id("city")} required error={errors.city}>
        {cities.length > 0 ? (
          <SearchSelect
            id={id("city")}
            value={value.city || null}
            selectedLabel={value.city}
            options={cities}
            placeholder={value.state ? "Select city" : "Choose a state first"}
            searchPlaceholder="Search cities"
            disabled={!value.state}
            invalid={!!errors.city}
            onChange={(option) => set({ city: option?.label ?? "" })}
          />
        ) : (
          <Input
            id={id("city")}
            value={value.city}
            disabled={!value.state}
            placeholder={value.state ? "City" : "Choose a state first"}
            aria-invalid={!!errors.city}
            onChange={(event) => set({ city: event.target.value })}
            onBlur={() => onBlurField?.("city")}
          />
        )}
      </FormField>

      <FormField
        label="Pincode"
        htmlFor={id("pincode")}
        required
        error={errors.pincode}
      >
        <Input
          id={id("pincode")}
          value={value.pincode}
          inputMode="text"
          autoComplete="postal-code"
          placeholder="e.g. 500081"
          aria-invalid={!!errors.pincode}
          onChange={(event) => set({ pincode: event.target.value })}
          onBlur={() => {
            if (validatePincode(countryIso, value.pincode))
              onBlurField?.("pincode");
          }}
        />
      </FormField>

      <FormField
        label="Street address"
        htmlFor={id("line")}
        hint="Optional: building, street, landmark."
        className="sm:col-span-2"
      >
        <Input
          id={id("line")}
          value={value.address}
          autoComplete="street-address"
          placeholder="Plot 12, Madhapur"
          onChange={(event) => set({ address: event.target.value })}
        />
      </FormField>
    </div>
  );
}
