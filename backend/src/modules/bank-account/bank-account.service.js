import { eq } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { driverBankAccounts, driverPayoutAccounts, drivers } from '../../../drizzle/schema/index.js';
import { encrypt } from '../../utils/encryption.js';
import { razorpayGateway } from '../payment/gateways/razorpay.gateway.js';
import { publishEvent, TOPICS } from '../../config/kafka.js';

// Driver-facing bank/wallet detail collection for the RazorpayX payout path (Stripe's
// equivalent is payout-account.service.js's hosted onboarding — Stripe collects bank details
// itself, this backend only ever touches raw account numbers for Razorpay). Every submit:
// 1. encrypts and upserts the driver_bank_accounts row (raw plaintext never touches the DB
//    or a log line — only accountNumberLast4 is kept in the clear),
// 2. creates/refreshes a RazorpayX Contact + Fund Account so the number is also usable by
//    payout.service.js,
// 3. resets the linked driver_payout_accounts row to 'pending' for admin re-review — same
//    re-verify-on-edit convention driver-documents.js already follows on re-upload.
export async function submitBankDetails(driverId, data, actor = { id: driverId, type: 'driver' }) {
  const { bankName, accountHolderName, accountNumber, routingCode, upiId, walletProvider, walletNumber } = data;
  if (!accountNumber && !upiId && !walletNumber) {
    throw { statusCode: 400, message: 'One of accountNumber (with routingCode), upiId, or walletNumber (with walletProvider) is required' };
  }
  if (accountNumber && !routingCode) {
    throw { statusCode: 400, message: 'routingCode is required alongside accountNumber' };
  }

  const [driver] = await db.select().from(drivers).where(eq(drivers.id, driverId)).limit(1);
  if (!driver) throw { statusCode: 404, message: 'Driver not found' };
  if (!driver.countryId) throw { statusCode: 422, message: 'Driver has no country on record' };

  const values = {
    driverId, countryId: driver.countryId,
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

  const [existing] = await db.select().from(driverBankAccounts).where(eq(driverBankAccounts.driverId, driverId)).limit(1);
  const [bankAccount] = existing
    ? await db.update(driverBankAccounts).set(values).where(eq(driverBankAccounts.driverId, driverId)).returning()
    : await db.insert(driverBankAccounts).values(values).returning();

  let [payoutAccount] = await db.select().from(driverPayoutAccounts).where(eq(driverPayoutAccounts.driverId, driverId)).limit(1);

  // UPI takes priority when both are submitted — it's the simpler, faster, and (in India) far
  // more commonly used rail; a driver only falls back to the bank-account fund account when
  // they haven't given a UPI id.
  let razorpayContactId = payoutAccount?.razorpayContactId ?? null;
  let razorpayFundAccountId = null;
  let razorpayFundAccountType = null;
  if (razorpayGateway.isConfigured && (upiId || accountNumber)) {
    if (!razorpayContactId) {
      ({ razorpayContactId } = await razorpayGateway.createContact({
        name: driver.name, email: driver.email, phone: driver.phone, referenceId: driverId,
      }));
    }
    ({ razorpayFundAccountId, razorpayFundAccountType } = await razorpayGateway.createFundAccount(
      upiId
        ? { contactId: razorpayContactId, upiId }
        : { contactId: razorpayContactId, bankAccount: { name: accountHolderName || driver.name, routingCode, accountNumber } },
    ));
  } else if (!razorpayGateway.isConfigured) {
    console.log('[BankAccount] Razorpay not configured — bank details stored, RazorpayX contact/fund account skipped (dev mode).');
  }

  const payoutValues = {
    driverId, gateway: 'razorpay', status: 'pending',
    rejectionReason: null, verifiedBy: null, verifiedAt: null,
    ...(razorpayContactId ? { razorpayContactId } : {}),
    ...(razorpayFundAccountId ? { razorpayFundAccountId, razorpayFundAccountType } : {}),
    updatedAt: new Date(),
  };
  [payoutAccount] = payoutAccount
    ? await db.update(driverPayoutAccounts).set(payoutValues).where(eq(driverPayoutAccounts.driverId, driverId)).returning()
    : await db.insert(driverPayoutAccounts).values(payoutValues).returning();

  await publishEvent(TOPICS.AUDIT_LOG, {
    actorId: actor.id, actorType: actor.type,
    action: 'BANK_DETAILS_SUBMITTED', entityType: 'driver_bank_account', entityId: bankAccount.id,
    ...(actor.type === 'admin' ? { meta: { driverId } } : {}),
  });

  return maskBankAccount(bankAccount);
}

export async function getMyBankDetails(driverId) {
  const [bankAccount] = await db.select().from(driverBankAccounts).where(eq(driverBankAccounts.driverId, driverId)).limit(1);
  return bankAccount ? maskBankAccount(bankAccount) : null;
}

// Never returns accountNumberEnc/walletNumberEnc — only the caller-side utils/encryption.js
// decrypt() function (called nowhere in this module) can ever recover the plaintext, and even
// then only server-side at the moment a Fund Account is created.
function maskBankAccount(row) {
  return {
    id: row.id, driverId: row.driverId, countryId: row.countryId,
    bankName: row.bankName, accountHolderName: row.accountHolderName,
    accountNumberLast4: row.accountNumberLast4, routingCode: row.routingCode,
    upiId: row.upiId, // a UPI VPA is a shareable payment handle, not secret — safe to return as-is
    walletProvider: row.walletProvider, hasWalletNumber: !!row.walletNumberEnc,
    isVerified: row.isVerified, updatedAt: row.updatedAt,
  };
}
