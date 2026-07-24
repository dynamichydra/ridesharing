ALTER TABLE "driver_bank_accounts" ADD COLUMN "upi_id" varchar(100);--> statement-breakpoint
ALTER TABLE "driver_payout_accounts" ADD COLUMN "razorpay_fund_account_type" varchar(20);