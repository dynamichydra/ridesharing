import { eq, and, sql, desc, gte } from 'drizzle-orm';
import { db } from '../../config/db.js';
import {
  driverIncentiveCampaigns, driverIncentiveRules, driverIncentiveProgress,
  driverIncentiveRewards, drivers, wallets,
} from '../../../drizzle/schema/index.js';
import { postTransaction, getOrCreateSystemAccount, getOrCreateWalletAccount } from '../ledger/ledger.service.js';
import { createFinancialTransaction } from '../ledger/financial-transaction.service.js';
import { getOrCreateWallet } from '../wallet/wallet.service.js';

/**
 * Record ride completion against active driver incentive campaigns.
 */
export async function processDriverTripIncentives(driverId, ride) {
  const now = new Date();
  // Find active campaigns matching driver region
  const activeCampaigns = await db.select().from(driverIncentiveCampaigns)
    .where(and(
      eq(driverIncentiveCampaigns.status, 'active'),
      gte(driverIncentiveCampaigns.endAt, now),
    ));

  const achievedRewards = [];

  for (const campaign of activeCampaigns) {
    const rules = await db.select().from(driverIncentiveRules)
      .where(eq(driverIncentiveRules.campaignId, campaign.id));

    for (const rule of rules) {
      // Find or create progress record
      let [progress] = await db.select().from(driverIncentiveProgress)
        .where(and(
          eq(driverIncentiveProgress.driverId, driverId),
          eq(driverIncentiveProgress.campaignId, campaign.id),
          eq(driverIncentiveProgress.ruleId, rule.id),
        )).limit(1);

      if (!progress) {
        [progress] = await db.insert(driverIncentiveProgress).values({
          driverId,
          campaignId: campaign.id,
          ruleId: rule.id,
          currentTrips: 1,
          status: 'in_progress',
        }).returning();
      } else if (progress.status === 'in_progress') {
        const nextTrips = progress.currentTrips + 1;
        const reached = rule.targetTrips && nextTrips >= rule.targetTrips;

        [progress] = await db.update(driverIncentiveProgress).set({
          currentTrips: nextTrips,
          status: reached ? 'achieved' : 'in_progress',
          achievedAt: reached ? new Date() : null,
          updatedAt: new Date(),
        }).where(eq(driverIncentiveProgress.id, progress.id)).returning();

        if (reached) {
          // Grant Reward and Post Ledger Transaction
          const reward = await grantDriverIncentiveReward(driverId, campaign, rule);
          achievedRewards.push(reward);
        }
      }
    }
  }

  return achievedRewards;
}

/**
 * Grant driver incentive bonus, post balanced ledger entries:
 * DR DRIVER_INCENTIVE_EXPENSE
 *   CR DRIVER_PAYABLE
 */
export async function grantDriverIncentiveReward(driverId, campaign, rule) {
  const driverWallet = await getOrCreateWallet(driverId, 'driver', campaign.currencyCode);
  const driverLedgerAccount = await getOrCreateWalletAccount(driverWallet.id, campaign.currencyCode, {
    ownerType: 'driver',
    ownerId: driverId,
  });

  const expenseAccount = await getOrCreateSystemAccount('expense:driver_incentives', campaign.currencyCode, {
    accountCategory: 'EXPENSE',
    subType: 'DRIVER_INCENTIVE_EXPENSE',
  });

  const entries = [
    {
      accountId: expenseAccount.id,
      direction: 'debit',
      amountMinor: rule.rewardAmountMinor,
      currencyCode: campaign.currencyCode,
    },
    {
      accountId: driverLedgerAccount.id,
      direction: 'credit',
      amountMinor: rule.rewardAmountMinor,
      currencyCode: campaign.currencyCode,
      reason: `incentive_reward_${campaign.id}`,
    },
  ];

  const idempotencyKey = `incentive_${campaign.id}_${rule.id}_${driverId}`;
  const ledgerResult = await postTransaction({
    businessType: 'driver_incentive_reward',
    idempotencyKey,
    entries,
    referenceType: 'driver_incentive',
    referenceId: rule.id,
    metadata: { driverId, campaignId: campaign.id, ruleId: rule.id },
  });

  await createFinancialTransaction({
    transactionType: 'DRIVER_INCENTIVE',
    referenceType: 'driver_incentive',
    referenceId: rule.id,
    currencyCode: campaign.currencyCode,
    amountMinor: rule.rewardAmountMinor,
    status: 'settled',
    metadata: { driverId, campaignId: campaign.id },
  });

  const [reward] = await db.insert(driverIncentiveRewards).values({
    driverId,
    campaignId: campaign.id,
    ruleId: rule.id,
    rewardAmountMinor: rule.rewardAmountMinor,
    currencyCode: campaign.currencyCode,
    status: 'credited',
    ledgerTransactionId: ledgerResult.transaction.id,
  }).returning();

  return reward;
}

/**
 * List active incentive campaigns available for driver.
 */
export async function listActiveIncentiveCampaigns(driverId) {
  const now = new Date();
  const campaigns = await db.select().from(driverIncentiveCampaigns)
    .where(and(
      eq(driverIncentiveCampaigns.status, 'active'),
      gte(driverIncentiveCampaigns.endAt, now),
    ));

  const result = [];
  for (const c of campaigns) {
    const rules = await db.select().from(driverIncentiveRules)
      .where(eq(driverIncentiveRules.campaignId, c.id));
    result.push({
      ...c,
      rules,
    });
  }

  return result;
}

/**
 * Get real-time quest progress tracker for driver.
 */
export async function getDriverIncentiveProgress(driverId) {
  const now = new Date();
  const activeCampaigns = await listActiveIncentiveCampaigns(driverId);

  const progressList = [];
  for (const campaign of activeCampaigns) {
    for (const rule of campaign.rules) {
      const [prog] = await db.select().from(driverIncentiveProgress)
        .where(and(
          eq(driverIncentiveProgress.driverId, driverId),
          eq(driverIncentiveProgress.campaignId, campaign.id),
          eq(driverIncentiveProgress.ruleId, rule.id),
        )).limit(1);

      const currentTrips = prog ? prog.currentTrips : 0;
      const targetTrips = rule.targetTrips || 1;
      const percentComplete = Math.min(100, Math.round((currentTrips / targetTrips) * 100));
      const isAchieved = prog ? prog.status === 'achieved' : currentTrips >= targetTrips;

      progressList.push({
        campaignId: campaign.id,
        campaignName: campaign.name,
        campaignType: campaign.campaignType,
        ruleId: rule.id,
        ruleType: rule.ruleType,
        targetTrips,
        currentTrips,
        tripsRemaining: Math.max(0, targetTrips - currentTrips),
        rewardAmountMinor: rule.rewardAmountMinor,
        currencyCode: campaign.currencyCode,
        percentComplete,
        status: isAchieved ? 'achieved' : 'in_progress',
        endAt: campaign.endAt,
      });
    }
  }

  const rewards = await db.select().from(driverIncentiveRewards)
    .where(eq(driverIncentiveRewards.driverId, driverId))
    .orderBy(desc(driverIncentiveRewards.createdAt));

  return {
    activeQuests: progressList,
    totalRewardsEarnedMinor: rewards.reduce((sum, r) => sum + Number(r.rewardAmountMinor || 0), 0),
    rewardHistory: rewards,
  };
}

/**
 * Manually claim an achieved incentive reward (if not auto-credited).
 */
export async function claimIncentiveReward(driverId, campaignId, ruleId) {
  const [prog] = await db.select().from(driverIncentiveProgress)
    .where(and(
      eq(driverIncentiveProgress.driverId, driverId),
      eq(driverIncentiveProgress.campaignId, campaignId),
      eq(driverIncentiveProgress.ruleId, ruleId),
    )).limit(1);

  if (!prog || prog.status !== 'achieved') {
    throw { statusCode: 400, message: 'Incentive target not reached yet or not found' };
  }

  const [existingReward] = await db.select().from(driverIncentiveRewards)
    .where(and(
      eq(driverIncentiveRewards.driverId, driverId),
      eq(driverIncentiveRewards.campaignId, campaignId),
      eq(driverIncentiveRewards.ruleId, ruleId),
    )).limit(1);

  if (existingReward) {
    return { claimed: true, reward: existingReward, alreadyClaimed: true };
  }

  const [campaign] = await db.select().from(driverIncentiveCampaigns).where(eq(driverIncentiveCampaigns.id, campaignId)).limit(1);
  const [rule] = await db.select().from(driverIncentiveRules).where(eq(driverIncentiveRules.id, ruleId)).limit(1);

  const reward = await grantDriverIncentiveReward(driverId, campaign, rule);
  return { claimed: true, reward, alreadyClaimed: false };
}

