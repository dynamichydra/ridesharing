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
  cityTypeId: z.string().optional(),
  name: z.string().trim().min(1, "City name is required"),
  timezone: z.string().trim(),
  // See the comment on countrySchema.sortOrder — kept as a validated string, not z.coerce.number().
  sortOrder: z.string().trim().regex(/^\d+$/, "Must be a whole number"),
});

export type CityFormValues = z.infer<typeof citySchema>;

export const emptyCityFormValues: CityFormValues = {
  countryId: "",
  stateId: "",
  cityTypeId: "",
  name: "",
  timezone: "",
  sortOrder: "0",
};

export const cityTypeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .regex(/^[A-Z0-9_-]+$/, "Code must be uppercase letters, numbers, dashes, or underscores"),
  name: z.string().trim().min(1, "Type name is required"),
  description: z.string().trim().optional(),
  costIndex: z
    .string()
    .trim()
    .min(1, "Cost index is required")
    .regex(/^\d+(\.\d+)?$/, "Enter a valid decimal (e.g. 1.00)"),
  densityLevel: z.enum(["high", "medium", "low", "rural"]),
  defaultSurgeCap: z
    .string()
    .trim()
    .min(1, "Surge cap is required")
    .regex(/^\d+(\.\d+)?$/, "Enter a valid decimal (e.g. 3.00)"),
  waitingFeeEnabled: z.boolean(),
  sortOrder: z.string().trim().regex(/^\d+$/, "Must be a whole number"),
});

export type CityTypeFormValues = z.infer<typeof cityTypeSchema>;

export const emptyCityTypeFormValues: CityTypeFormValues = {
  code: "",
  name: "",
  description: "",
  costIndex: "1.00",
  densityLevel: "medium",
  defaultSurgeCap: "3.00",
  waitingFeeEnabled: true,
  sortOrder: "0",
};

export const serviceAreaSchema = z.object({
  cityId: z.string().min(1, "City is required"),
  name: z.string().trim().min(1, "Area name is required"),
  status: z.enum(["ACTIVE", "INACTIVE", "RESTRICTED"]),
  polygon: z.string().min(1, "Polygon coordinates are required"),
  resolution: z
    .string()
    .optional()
    .refine((val) => !val || /^(8|9|10)$/.test(val), "Resolution must be 8, 9, or 10"),
});

export type ServiceAreaFormValues = z.infer<typeof serviceAreaSchema>;

export const emptyServiceAreaFormValues: ServiceAreaFormValues = {
  cityId: "",
  name: "",
  status: "ACTIVE",
  polygon: "",
  resolution: "9",
};

export const currencySchema = z.object({
  code: z
    .string()
    .trim()
    .length(3, "Currency code must be exactly 3 letters (e.g. USD, INR)")
    .transform((val) => val.toUpperCase()),
  name: z.string().trim().min(1, "Currency name is required"),
  symbol: z.string().trim().min(1, "Currency symbol is required (e.g. ₹, $, €)"),
  minorUnitExponent: z
    .string()
    .trim()
    .regex(/^[0-4]$/, "Exponent must be between 0 and 4 (standard is 2 for cents/paise)"),
});

export type CurrencyFormValues = z.infer<typeof currencySchema>;

export const emptyCurrencyFormValues: CurrencyFormValues = {
  code: "",
  name: "",
  symbol: "",
  minorUnitExponent: "2",
};


