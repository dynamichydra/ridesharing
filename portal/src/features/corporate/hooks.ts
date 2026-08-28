import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { corporateApi } from "./api";
import type {
  CorporateAccountListParams,
  CreateCorporateAccountPayload,
  AddCorporateUserPayload,
  GenerateInvoicePayload,
  PayInvoicePayload,
} from "./types";

const QUERY_KEY = "corporate";

export function useCorporateAccounts(params: CorporateAccountListParams = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, "accounts", params],
    queryFn: () => corporateApi.listAccounts(params),
  });
}

export function useCorporateInvoices(corporateAccountId?: string, page = 1, limit = 10) {
  return useQuery({
    queryKey: [QUERY_KEY, "invoices", corporateAccountId, page, limit],
    queryFn: () => corporateApi.listInvoices(corporateAccountId, page, limit),
  });
}

export function useCreateCorporateAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCorporateAccountPayload) =>
      corporateApi.createAccount(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Corporate account created successfully");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.MESSAGE || "Failed to create corporate account");
    },
  });
}

export function useAddCorporateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      accountId,
      payload,
    }: {
      accountId: string;
      payload: AddCorporateUserPayload;
    }) => corporateApi.addUser(accountId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Employee user linked to corporate account");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.MESSAGE || "Failed to add employee");
    },
  });
}

export function useGenerateCorporateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      accountId,
      payload,
    }: {
      accountId: string;
      payload: GenerateInvoicePayload;
    }) => corporateApi.generateInvoice(accountId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Corporate billing invoice generated");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.MESSAGE || "Failed to generate invoice");
    },
  });
}

export function usePayCorporateInvoice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      invoiceId,
      payload,
    }: {
      invoiceId: string;
      payload: PayInvoicePayload;
    }) => corporateApi.payInvoice(invoiceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Payment recorded and ledger settled");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.MESSAGE || "Failed to record payment");
    },
  });
}
