import { checkLedgerInvariants } from './ledger.service.js';
import { listFinancialTransactions } from './financial-transaction.service.js';

export async function runFullFinancialAudit() {
  const invariantStatus = await checkLedgerInvariants();
  return {
    timestamp: new Date(),
    invariants: invariantStatus,
    status: invariantStatus.isHealthy ? 'HEALTHY' : 'DISCREPANCY_DETECTED',
  };
}
