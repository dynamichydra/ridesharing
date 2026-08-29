ALTER TABLE "driver_vehicles" ADD COLUMN "image" varchar(500);--> statement-breakpoint
ALTER TABLE "driver_vehicles" ADD COLUMN "images" jsonb DEFAULT '[]';