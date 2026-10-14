import { Country } from "country-state-city";
import { validate } from "postal-codes-js";
import { z } from "zod";
import type { AddressValue } from "@/types/address";

export const EMPTY_ADDRESS: AddressValue = {
  address: "",
  city: "",
  state: "",
  country: "",
  pincode: "",
};

/** Looks a country up by its name, which is what we store on the RFQ. */
export function findCountryIso(name: string): string | null {
  const wanted = name.trim().toLowerCase();
  if (!wanted) return null;
  return (
    Country.getAllCountries().find(
      (country) => country.name.toLowerCase() === wanted,
    )?.isoCode ?? null
  );
}

/** Null when the pincode is fine (or the country has no known format), otherwise a message. */
export function validatePincode(
  countryIso: string | null,
  pincode: string,
): string | null {
  if (!pincode.trim()) return "Pincode is required.";
  if (!countryIso) return null;
  const result = validate(countryIso, pincode.trim());
  if (result === true) return null;
  return "Enter a valid pincode for the selected country.";
}

/** The delivery address rules. The pincode is checked against the chosen country's format. */
export const addressSchema = z
  .object({
    address: z.string(),
    country: z.string().min(1, "Choose a country."),
    state: z.string().trim().min(1, "Choose a state."),
    city: z.string().trim().min(1, "Choose a city."),
    pincode: z.string(),
  })
  .superRefine((value, ctx) => {
    const message = validatePincode(
      findCountryIso(value.country),
      value.pincode,
    );
    if (message) ctx.addIssue({ code: "custom", path: ["pincode"], message });
  });
