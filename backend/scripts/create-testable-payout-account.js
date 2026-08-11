import 'dotenv/config';
import { db } from '../src/config/db.js';
import { drivers, driverPayoutAccounts, wallets, countries } from '../drizzle/schema/index.js';
import { getOrCreateWallet } from '../src/modules/wallet/wallet.service.js';
import { eq } from 'drizzle-orm';

async function createTestablePayoutAccount() {
  console.log('--- CREATING TESTABLE DRIVER PAYOUT ACCOUNT ---');

  // 1. Get or create a driver
  let [driver] = await db.select().from(drivers).limit(1);

  if (!driver) {
    console.log('No existing driver found, fetching default country...');
    let [country] = await db.select().from(countries).limit(1);
    if (!country) {
      [country] = await db.insert(countries).values({
        name: 'India', isoCode: 'IN', currencyCode: 'INR', phoneCode: '+91',
      }).returning();
    }

    [driver] = await db.insert(drivers).values({
      name: 'Test Driver',
      email: 'driver.test@example.com',
      phone: '+919876543210',
      approvalStatus: 'approved',
      countryId: country.id,
      isOnline: true,
    }).returning();
    console.log(`Created test driver: ${driver.id}`);
  } else {
    console.log(`Using existing driver: ${driver.name} (ID: ${driver.id})`);
  }

  // 2. Ensure driver has a wallet
  const wallet = await getOrCreateWallet('driver', driver.id);
  if (parseFloat(wallet.balance) < 100) {
    await db.update(wallets)
      .set({ balance: '500.00' })
      .where(eq(wallets.id, wallet.id));
    wallet.balance = '500.00';
  }

  // 3. Upsert approved driver_payout_accounts row
  const payoutAccountValues = {
    driverId: driver.id,
    gateway: 'razorpay',
    razorpayContactId: 'cont_test_999999',
    razorpayFundAccountId: 'fa_test_888888',
    razorpayFundAccountType: 'vpa', // UPI test rail
    status: 'approved', // Must be 'approved' for payouts to execute
    verifiedAt: new Date(),
    updatedAt: new Date(),
  };

  let [payoutAccount] = await db.select().from(driverPayoutAccounts).where(eq(driverPayoutAccounts.driverId, driver.id)).limit(1);

  if (payoutAccount) {
    [payoutAccount] = await db.update(driverPayoutAccounts)
      .set(payoutAccountValues)
      .where(eq(driverPayoutAccounts.id, payoutAccount.id))
      .returning();
    console.log('✅ Updated existing payout account to APPROVED status!');
  } else {
    [payoutAccount] = await db.insert(driverPayoutAccounts)
      .values(payoutAccountValues)
      .returning();
    console.log('✅ Created new APPROVED driver payout account!');
  }

  console.log('\n--- TESTABLE DRIVER PAYOUT ACCOUNT DETAILS ---');
  console.log(JSON.stringify({
    payoutAccountId: payoutAccount.id,
    driverId: driver.id,
    driverName: driver.name,
    gateway: payoutAccount.gateway,
    razorpayContactId: payoutAccount.razorpayContactId,
    razorpayFundAccountId: payoutAccount.razorpayFundAccountId,
    razorpayFundAccountType: payoutAccount.razorpayFundAccountType,
    status: payoutAccount.status,
    walletBalance: `₹${wallet.balance}`,
  }, null, 2));

  process.exit(0);
}

createTestablePayoutAccount().catch((err) => {
  console.error('❌ Error creating payout account:', err);
  process.exit(1);
});
