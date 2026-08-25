ALTER TABLE "payments" ADD COLUMN "ride_id" uuid;--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "payment_method" varchar(10);--> statement-breakpoint
ALTER TABLE "rides" ADD COLUMN "payment_status" varchar(20) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");