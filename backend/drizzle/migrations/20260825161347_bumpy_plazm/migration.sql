ALTER TABLE "driver_payout_accounts" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "driver_payout_accounts" ALTER COLUMN "status" SET DATA TYPE "payout_account_status" USING "status"::"payout_account_status";--> statement-breakpoint
ALTER TABLE "driver_payout_accounts" ALTER COLUMN "status" SET DEFAULT 'pending'::"payout_account_status";