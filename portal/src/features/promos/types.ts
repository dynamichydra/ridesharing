export type DiscountType = "PERCENTAGE" | "FLAT" | "FIXED_PRICE";

export interface Promo {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValueMinor: number;
  minFareMinor?: number | null;
  maxDiscountMinor?: number | null;
  maxUses?: number | null;
  usedCount: number;
  perUserLimit?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  countryId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PromoListParams {
  isActive?: boolean | string;
  countryId?: string;
  page?: number;
  limit?: number;
}

export interface CreatePromoPayload {
  code: string;
  discountType: DiscountType;
  discountValueMinor: number;
  minFareMinor?: number | null;
  maxDiscountMinor?: number | null;
  maxUses?: number | null;
  perUserLimit?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  countryId?: string | null;
  isActive?: boolean;
}

export interface UpdatePromoPayload extends Partial<CreatePromoPayload> {}
