ALTER TABLE "rider_subscriptions" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "rider_subscriptions" ALTER COLUMN "status" SET DATA TYPE "subscription_status" USING "status"::"subscription_status";--> statement-breakpoint
ALTER TABLE "rider_subscriptions" ALTER COLUMN "status" SET DEFAULT 'active'::"subscription_status";--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DATA TYPE "subscription_status" USING "status"::"subscription_status";--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DEFAULT 'active'::"subscription_status";