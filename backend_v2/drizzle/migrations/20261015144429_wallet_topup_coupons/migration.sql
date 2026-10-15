-- payment_methods columns were added by 20261012110000_region_aware_payment_methods (hand-written,
-- not in the drizzle snapshot), so drizzle-kit's re-adds of them are removed from this migration.
ALTER TABLE "promo_usages" ADD COLUMN "payment_id" uuid;--> statement-breakpoint
ALTER TABLE "promos" ADD COLUMN "applies_to" varchar(20) DEFAULT 'ride' NOT NULL;--> statement-breakpoint
ALTER TABLE "promo_usages" ALTER COLUMN "ride_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "promo_usages" ADD CONSTRAINT "promo_usages_promo_id_payment_id_unique" UNIQUE("promo_id","payment_id");--> statement-breakpoint
ALTER TABLE "promo_usages" ADD CONSTRAINT "promo_usages_payment_id_payments_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "payments"("id");