export interface FxRate {
  id: string;
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  provider: string;
  effectiveDate: string;
  createdAt: string;
}

export interface FxRateListParams {
  baseCurrency?: string;
  quoteCurrency?: string;
  page?: number;
  limit?: number;
}

export interface CreateFxRatePayload {
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
  provider?: string;
}

export interface ConvertMoneyPayload {
  amountMinor: number;
  baseCurrency: string;
  quoteCurrency: string;
  baseExponent?: number;
  quoteExponent?: number;
}

export interface ConvertMoneyResponse {
  originalAmountMinor: number;
  convertedAmountMinor: number;
  baseCurrency: string;
  quoteCurrency: string;
  rate: number;
}
