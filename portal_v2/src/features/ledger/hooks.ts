import { useQuery } from "@tanstack/react-query";
import { ledgerApi } from "./api";
import type { LedgerTransactionListParams } from "./types";

const LEDGER_KEY = "ledger-transactions";

export function useLedgerTransactions(params: LedgerTransactionListParams = {}) {
  return useQuery({
    queryKey: [LEDGER_KEY, params],
    queryFn: () => ledgerApi.list(params),
  });
}

export function useLedgerTransaction(id?: string) {
  return useQuery({
    queryKey: [LEDGER_KEY, "detail", id],
    queryFn: () => ledgerApi.getById(id as string),
    enabled: !!id,
  });
}
