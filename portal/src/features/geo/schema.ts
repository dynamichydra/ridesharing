import { z } from "zod";

export const countrySchema = z.object({
  name: z.string().trim().min(1, "Country name is required"),

  isoCode: z
    .string()
    .trim()
    .length(2, "ISO code must be exactly 2 letters")
    .transform((val) => val.toUpperCase()),

  dialCode: z
    .string()
    .trim()
    .min(1, "Dial code is required")
    .regex(/^\+?[0-9]{1,4}$/, "Enter a valid dial code, e.g. +91"),

  currencyCode: z
    .string()
    .trim()
    .length(3, "Currency code must be exactly 3 letters")
    .transform((val) => val.toUpperCase()),

  defaultLanguageCode: z.string().trim(),
  timezone: z.string().trim(),

  // Kept as validated strings (not z.coerce.number()) — react-hook-form's zodResolver
  // needs the schema's input and output types to match, which z.coerce breaks. Converted
  // to a number in the dialog right before it's sent to the API.
  roundingIncrementMinor: z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, "Must be a whole number of at least 1"),

  sortOrder: z.string().trim().regex(/^\d+$/, "Must be a whole number"),

  isDefault: z.boolean(),
});

export type CountryFormValues = z.infer<typeof countrySchema>;

export const emptyCountryFormValues: CountryFormValues = {
  name: "",
  isoCode: "",
  dialCode: "",
  currencyCode: "",
  defaultLanguageCode: "",
  timezone: "UTC",
  roundingIncrementMinor: "1",
  sortOrder: "0",
  isDefault: false,
};

export const stateSchema = z.object({
  countryId: z.string().min(1, "Country is required"),
  name: z.string().trim().min(1, "State name is required"),
  code: z.string().trim(),
});

export type StateFormValues = z.infer<typeof stateSchema>;

export const emptyStateFormValues: StateFormValues = {
  countryId: "",
  name: "",
  code: "",
};

export const citySchema = z.object({
  countryId: z.string().min(1, "Country is required"),
  stateId: z.string().min(1, "State is required"),
  name: z.string().trim().min(1, "City name is required"),
  timezone: z.string().trim(),
  // See the comment on countrySchema.sortOrder — kept as a validated string, not z.coerce.number().
  sortOrder: z.string().trim().regex(/^\d+$/, "Must be a whole number"),
});

export type CityFormValues = z.infer<typeof citySchema>;

export const emptyCityFormValues: CityFormValues = {
  countryId: "",
  stateId: "",
  name: "",
  timezone: "",
  sortOrder: "0",
};
