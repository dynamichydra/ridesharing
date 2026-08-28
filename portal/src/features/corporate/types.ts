export interface CorporateAccount {
  id: string;
  name: string;
  businessRegistrationNumber?: string | null;
  taxId?: string | null;
  billingEmail: string;
  billingPhone?: string | null;
  creditLimitMinor: number;
  currentExposureMinor: number;
  currencyCode: string;
  status: "active" | "suspended" | "closed";
  createdAt: string;
  updatedAt: string;
}

export interface CorporateInvoice {
  id: string;
  corporateAccountId: string;
  invoiceNumber: string;
  periodStart: string;
  periodEnd: string;
  subtotalMinor: number;
  taxMinor: number;
  totalMinor: number;
  paidAmountMinor: number;
  currencyCode: string;
  status: "draft" | "issued" | "partially_paid" | "paid" | "overdue" | "cancelled";
  dueAt: string;
  paidAt?: string | null;
  createdAt: string;
}

export interface CorporateAccountListParams {
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreateCorporateAccountPayload {
  name: string;
  billingEmail: string;
  billingPhone?: string;
  businessRegistrationNumber?: string;
  taxId?: string;
  creditLimitMinor: number;
  currencyCode?: string;
}

export interface AddCorporateUserPayload {
  userId: string;
  role?: "admin" | "manager" | "employee";
  spendingLimitMinor?: number | null;
}

export interface GenerateInvoicePayload {
  periodStart: string;
  periodEnd: string;
}

export interface PayInvoicePayload {
  amountMinor: number;
  paymentMethod: string;
  gatewayPaymentId?: string;
}
