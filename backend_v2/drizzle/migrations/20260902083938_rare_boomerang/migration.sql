CREATE TYPE "driver_approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "driver_registration_status" AS ENUM('new', 'mobile_verified', 'email_verified', 'registration_in_progress', 'documents_pending', 'pending_review', 'under_verification', 'approved', 'rejected', 'suspended', 'active', 'inactive');--> statement-breakpoint
ALTER TABLE "driver_payout_accounts" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "driver_payout_accounts" ALTER COLUMN "status" SET DATA TYPE "payout_account_status" USING "status"::"payout_account_status";--> statement-breakpoint
ALTER TABLE "driver_payout_accounts" ALTER COLUMN "status" SET DEFAULT 'pending'::"payout_account_status";--> statement-breakpoint
ALTER TABLE "drivers" ALTER COLUMN "registration_status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "drivers" ALTER COLUMN "registration_status" SET DATA TYPE "driver_registration_status" USING "registration_status"::"driver_registration_status";--> statement-breakpoint
ALTER TABLE "drivers" ALTER COLUMN "registration_status" SET DEFAULT 'new'::"driver_registration_status";--> statement-breakpoint
ALTER TABLE "drivers" ALTER COLUMN "approval_status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "drivers" ALTER COLUMN "approval_status" SET DATA TYPE "driver_approval_status" USING "approval_status"::"driver_approval_status";--> statement-breakpoint
ALTER TABLE "drivers" ALTER COLUMN "approval_status" SET DEFAULT 'pending'::"driver_approval_status";