ALTER TABLE "promo_usages" ADD CONSTRAINT "promo_usages_promo_id_ride_id_unique" UNIQUE("promo_id","ride_id");--> statement-breakpoint
CREATE INDEX "drivers_online_idx" ON "drivers" ("is_online");--> statement-breakpoint
CREATE INDEX "drivers_approval_status_idx" ON "drivers" ("approval_status");--> statement-breakpoint
CREATE INDEX "drivers_registration_status_idx" ON "drivers" ("registration_status");--> statement-breakpoint
CREATE INDEX "drivers_vehicle_type_idx" ON "drivers" ("vehicle_type_id");--> statement-breakpoint
CREATE INDEX "drivers_location_idx" ON "drivers" ("country_id","city_id");--> statement-breakpoint
CREATE INDEX "payments_ride_status_idx" ON "payments" ("ride_id","status");--> statement-breakpoint
CREATE INDEX "payments_gateway_order_idx" ON "payments" ("gateway_order_id");--> statement-breakpoint
CREATE INDEX "payments_wallet_idx" ON "payments" ("wallet_id");--> statement-breakpoint
CREATE INDEX "payments_subscription_idx" ON "payments" ("subscription_id");--> statement-breakpoint
CREATE INDEX "ride_offers_ride_status_idx" ON "ride_offers" ("ride_id","status");--> statement-breakpoint
CREATE INDEX "ride_offers_driver_status_idx" ON "ride_offers" ("driver_id","status");--> statement-breakpoint
CREATE INDEX "ride_offers_expires_at_idx" ON "ride_offers" ("expires_at");--> statement-breakpoint
CREATE INDEX "rides_rider_status_idx" ON "rides" ("rider_id","status");--> statement-breakpoint
CREATE INDEX "rides_driver_status_idx" ON "rides" ("driver_id","status");--> statement-breakpoint
CREATE INDEX "rides_status_idx" ON "rides" ("status");--> statement-breakpoint
CREATE INDEX "rides_requested_at_idx" ON "rides" ("requested_at");--> statement-breakpoint
CREATE INDEX "rides_country_idx" ON "rides" ("country_id");