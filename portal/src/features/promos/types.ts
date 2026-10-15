export type DiscountType =
  | "PERCENTAGE"
  | "FLAT"
  | "percentage"
  | "flat_amount";

/** What a code is redeemed against: ride fare discount, or bonus credit on a rider wallet top-up. */
export type PromoAppliesTo = "ride" | "wallet_topup";

export interface LookupOption {
  id: string;
  name: string;
  countryId?: string;
}

export interface Promo {
  id: string;
  code: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue?: number;
  discountValueMinor: number;
  minFareMinor?: number | null;
  maxDiscountMinor?: number | null;
  usageLimit?: number | null;
  maxUses?: number | null;
  usedCount: number;
  perUserLimit?: number | null;
  isFirstRideOnly?: boolean;
  appliesTo?: PromoAppliesTo;
  startsAt?: string | null;
  expiresAt?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  countryId?: string | null;
  cityId?: string | null;
  vehicleTypeId?: string | null;
  country?: LookupOption | null;
  city?: LookupOption | null;
  vehicleType?: LookupOption | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromoListParams {
  isActive?: boolean | string;
  countryId?: string;
  cityId?: string;
  vehicleTypeId?: string;
  page?: number;
  limit?: number;
}

export interface CreatePromoPayload {
  code: string;
  description?: string | null;
  discountType: DiscountType;
  discountValueMinor: number;
  discountValue?: number;
  minFareMinor?: number | null;
  maxDiscountMinor?: number | null;
  maxUses?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  isFirstRideOnly?: boolean;
  appliesTo?: PromoAppliesTo;
  startsAt?: string | null;
  expiresAt?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  countryId?: string | null;
  cityId?: string | null;
  vehicleTypeId?: string | null;
  isActive?: boolean;
}

export interface UpdatePromoPayload extends Partial<CreatePromoPayload> {}

