import { apiClient } from "@/lib/api-client";
import type {
  CorporateAccount,
  CorporateInvoice,
  CorporateAccountListParams,
  CreateCorporateAccountPayload,
  AddCorporateUserPayload,
  GenerateInvoicePayload,
  PayInvoicePayload,
} from "./types";

const BASE_URL = "/corporate";

function buildQuery(params: CorporateAccountListParams) {
  const query = new URLSearchParams();
  query.set("page", String(params.page ?? 1));
  query.set("limit", String(params.limit ?? 10));
  if (params.status) query.set("status", params.status);
  return query.toString();
}

export const corporateApi = {
  listAccounts: (params: CorporateAccountListParams = {}) =>
    apiClient.get<CorporateAccount[]>(`${BASE_URL}/accounts?${buildQuery(params)}`),

  createAccount: (payload: CreateCorporateAccountPayload) =>
    apiClient.post<CorporateAccount>(`${BASE_URL}/accounts`, payload),

  addUser: (accountId: string, payload: AddCorporateUserPayload) =>
    apiClient.post(`${BASE_URL}/accounts/${accountId}/users`, payload),

  checkCredit: (accountId: string, amountMinor: number) =>
    apiClient.get(`${BASE_URL}/accounts/${accountId}/credit-check?amountMinor=${amountMinor}`),

  listInvoices: (corporateAccountId?: string, page = 1, limit = 10) =>
    apiClient.get<CorporateInvoice[]>(
      `${BASE_URL}/invoices?${new URLSearchParams({
        page: String(page),
        limit: String(limit),
        ...(corporateAccountId ? { corporateAccountId } : {}),
      }).toString()}`,
    ),

  generateInvoice: (accountId: string, payload: GenerateInvoicePayload) =>
    apiClient.post<CorporateInvoice>(`${BASE_URL}/accounts/${accountId}/invoices`, payload),

  payInvoice: (invoiceId: string, payload: PayInvoicePayload) =>
    apiClient.post(`${BASE_URL}/invoices/${invoiceId}/pay`, payload),
};
