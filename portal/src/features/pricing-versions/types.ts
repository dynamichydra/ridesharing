export interface PricingVersion {
  id: string;
  countryId: string | null;
  currencyId: string | null;
  vehicleTypeId: string | null;
  cityId: string | null;
  zoneId: string | null;
  baseFareMinor: number;
  minFareMinor: number;
  perKmRateMinor: number;
  perMinRateMinor: number;
  waitingPricePerMinMinor: number;
  bookingFeeMinor: number;
  cancellationFeeMinor: number;
  noShowFeeMinor: number;
  airportFeeMinor: number;
  tollFeeMinor: number;
  taxPercentage: string;
  surgeFloorMultiplier: string;
  surgeCapMultiplier: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PricingVersionListParams {
  page?: number;
  limit?: number;
  [key: string]: any;
}
