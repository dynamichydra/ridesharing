ALTER TABLE "trips" ADD COLUMN "arrived_at" timestamp;--> statement-breakpoint
ALTER TABLE "trip_status_history" ADD COLUMN "from_status" varchar(50);--> statement-breakpoint
ALTER TABLE "trip_status_history" ADD COLUMN "changed_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "trip_status_history" ADD CONSTRAINT "trip_status_history_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;