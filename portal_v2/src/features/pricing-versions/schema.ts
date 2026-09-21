import { z } from "zod";

export const pricingVersionSchema = z.object({
  countryId: z.string().optional().nullable(),
  currencyId: z.string().optional().nullable(),
  vehicleTypeId: z.string().optional().nullable(),
  cityId: z.string().optional().nullable(),
  zoneId: z.string().optional().nullable(),
  
  baseFareMinor: z.coerce.number().min(0, "Base fare must be non-negative"),
  minFareMinor: z.coerce.number().min(0, "Minimum fare must be non-negative"),
  perKmRateMinor: z.coerce.number().min(0, "Per KM rate must be non-negative"),
  perMinRateMinor: z.coerce.number().min(0, "Per minute rate must be non-negative"),
  waitingPricePerMinMinor: z.coerce.number().min(0).default(0),
  waitingGracePeriodMin: z.coerce.number().min(0).default(3),
  bookingFeeMinor: z.coerce.number().min(0).default(0),
  serviceFeeMinor: z.coerce.number().min(0).default(0),
  cancellationFeeMinor: z.coerce.number().min(0).default(0),
  noShowFeeMinor: z.coerce.number().min(0).default(0),
  airportFeeMinor: z.coerce.number().min(0).default(0),
  tollFeeMinor: z.coerce.number().min(0).default(0),
  
  taxPercentage: z.string().default("0.00"),
  surgeFloorMultiplier: z.string().default("1.00"),
  surgeCapMultiplier: z.string().default("3.00"),
  isActive: z.boolean().default(true),
});

export type PricingVersionFormValues = z.infer<typeof pricingVersionSchema>;
