CREATE TABLE "ride_fare_splits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"ride_id" uuid NOT NULL,
	"inviter_id" uuid NOT NULL,
	"invitee_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"split_amount_minor" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ride_fare_splits" ADD CONSTRAINT "ride_fare_splits_ride_id_rides_id_fkey" FOREIGN KEY ("ride_id") REFERENCES "rides"("id");--> statement-breakpoint
ALTER TABLE "ride_fare_splits" ADD CONSTRAINT "ride_fare_splits_inviter_id_users_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "ride_fare_splits" ADD CONSTRAINT "ride_fare_splits_invitee_id_users_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "users"("id");