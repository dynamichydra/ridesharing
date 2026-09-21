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
  code: z.string().trim().min(1, "City code is required"),
  currencyCode: z.string().trim(),
  timezone: z.string().trim(),
  polygon: z.string().optional(),
  resolution: z
    .string()
    .optional()
    .refine((val) => !val || /^(8|9|10)$/.test(val), "Resolution must be 8, 9, or 10"),
  status: z.enum(["ACTIVE", "INACTIVE", "RESTRICTED"]).optional(),
  sortOrder: z.string().trim().regex(/^\d+$/, "Must be a whole number"),
  isActive: z.boolean(),
});

export type CityFormValues = z.infer<typeof citySchema>;

export const emptyCityFormValues: CityFormValues = {
  countryId: "",
  stateId: "",
  cityTypeId: "",
  name: "",
  code: "",
  currencyCode: "INR",
  timezone: "UTC",
  polygon: "",
  resolution: "8",
  status: "ACTIVE",
  sortOrder: "0",
  isActive: true,
};

export const cityTypeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Code is required")
    .regex(/^[A-Z0-9_-]+$/, "Code must be uppercase letters, numbers, dashes, or underscores"),
  name: z.string().trim().min(1, "Type name is required"),
  description: z.string().trim().optional(),
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
  densityLevel: "medium",
  defaultSurgeCap: "3.00",
  waitingFeeEnabled: true,
  sortOrder: "0",
};

export const cityTypeFareSchema = z.object({
  vehicleTypeId: z.string().min(1, "Vehicle type is required"),
  baseFare: z.string().trim().regex(/^\d+(\.\d+)?$/, "Enter a valid amount"),
  costPerKm: z.string().trim().regex(/^\d+(\.\d+)?$/, "Enter a valid amount"),
  costPerMin: z.string().trim().regex(/^\d+(\.\d+)?$/, "Enter a valid amount"),
  waitingCostPerMin: z.string().trim().regex(/^\d+(\.\d+)?$/, "Enter a valid amount"),
  freeWaitingMinutes: z.string().trim().regex(/^\d+$/, "Must be a whole number"),
  minFare: z.string().trim().regex(/^\d+(\.\d+)?$/, "Enter a valid amount"),
  cancellationFee: z.string().trim().regex(/^\d+(\.\d+)?$/, "Enter a valid amount"),
  commissionPercentage: z.string().trim().regex(/^\d+(\.\d+)?$/, "Enter a valid percentage"),
  flatCommission: z.string().trim().regex(/^\d+(\.\d+)?$/, "Enter a valid amount"),
  isActive: z.boolean(),
});

export type CityTypeFareFormValues = z.infer<typeof cityTypeFareSchema>;

export const emptyCityTypeFareFormValues: CityTypeFareFormValues = {
  vehicleTypeId: "",
  baseFare: "50",
  costPerKm: "12",
  costPerMin: "1.5",
  waitingCostPerMin: "2",
  freeWaitingMinutes: "3",
  minFare: "60",
  cancellationFee: "30",
  commissionPercentage: "15",
  flatCommission: "0",
  isActive: true,
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
