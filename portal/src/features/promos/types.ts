export type DiscountType =
  | "PERCENTAGE"
  | "FLAT"
  | "percentage"
  | "flat_amount";

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
  startsAt?: string | null;
  expiresAt?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
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
  description?: string | null;
  discountType: DiscountType;
  discountValueMinor: number;
  discountValue?: number;
  minFareMinor?: number | null;
  maxDiscountMinor?: number | null;
  maxUses?: number | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  validFrom?: string | null;
  validUntil?: string | null;
  countryId?: string | null;
  isActive?: boolean;
}

export interface UpdatePromoPayload extends Partial<CreatePromoPayload> {}
