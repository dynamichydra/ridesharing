import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { riderBankAccounts, users } from '../../../drizzle/schema/index.js';
import { encrypt } from '../../utils/encryption.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';

// Admin-only counterpart to bank-account.service.js's driver flow — riders have no payout rail
// today (no wallet withdrawal, no RazorpayX Contact/Fund Account), so this is pure record
// storage: encrypt, upsert, audit-log. Nothing here ever moves money.
export async function submitRiderBankDetails(riderId, data, actor) {
  const { bankName, accountHolderName, accountNumber, routingCode, upiId, walletProvider, walletNumber } = data;
  if (!accountNumber && !upiId && !walletNumber) {
    throw { statusCode: 400, message: 'One of accountNumber (with routingCode), upiId, or walletNumber (with walletProvider) is required' };
  }
  if (accountNumber && !routingCode) {
    throw { statusCode: 400, message: 'routingCode is required alongside accountNumber' };
  }

  const [rider] = await db.select().from(users).where(eq(users.id, riderId)).limit(1);
  if (!rider) throw { statusCode: 404, message: 'Rider not found' };
  if (!rider.countryId) throw { statusCode: 422, message: 'Rider has no country on record' };

  const values = {
    riderId, countryId: rider.countryId,
    bankName: bankName || null,
    accountHolderName: accountHolderName || null,
    accountNumberEnc: accountNumber ? encrypt(accountNumber) : null,
    accountNumberLast4: accountNumber ? String(accountNumber).slice(-4) : null,
    routingCode: routingCode || null,
    upiId: upiId || null,
    walletProvider: walletProvider || null,
    walletNumberEnc: walletNumber ? encrypt(walletNumber) : null,
    isVerified: false,
    updatedAt: new Date(),
  };

  const [existing] = await db.select().from(riderBankAccounts).where(eq(riderBankAccounts.riderId, riderId)).limit(1);
  const [bankAccount] = existing
    ? await db.update(riderBankAccounts).set(values).where(eq(riderBankAccounts.riderId, riderId)).returning()
    : await db.insert(riderBankAccounts).values(values).returning();

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: actor.id, actorType: actor.type,
    action: 'BANK_DETAILS_SUBMITTED', entityType: 'rider_bank_account', entityId: bankAccount.id,
    meta: { riderId },
  });

  return maskBankAccount(bankAccount);
}

export async function getRiderBankDetails(riderId) {
  const [bankAccount] = await db.select().from(riderBankAccounts).where(eq(riderBankAccounts.riderId, riderId)).limit(1);
  return bankAccount ? maskBankAccount(bankAccount) : null;
}

export async function setRiderBankVerified(riderId, isVerified) {
  const [bankAccount] = await db.update(riderBankAccounts)
    .set({ isVerified, updatedAt: new Date() })
    .where(eq(riderBankAccounts.riderId, riderId)).returning();
  if (!bankAccount) throw { statusCode: 404, message: 'Rider has no bank details on file' };
  return maskBankAccount(bankAccount);
}

function maskBankAccount(row) {
  return {
    id: row.id, riderId: row.riderId, countryId: row.countryId,
    bankName: row.bankName, accountHolderName: row.accountHolderName,
    accountNumberLast4: row.accountNumberLast4, routingCode: row.routingCode,
    upiId: row.upiId,
    walletProvider: row.walletProvider, hasWalletNumber: !!row.walletNumberEnc,
    isVerified: row.isVerified, updatedAt: row.updatedAt,
  };
}
