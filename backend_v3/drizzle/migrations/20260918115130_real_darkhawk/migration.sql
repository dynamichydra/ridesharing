ALTER TABLE "cities" ADD COLUMN "boundary" text;--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN "polygon" jsonb;--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN "hex_cells" jsonb DEFAULT '[]';--> statement-breakpoint
ALTER TABLE "cities" ADD COLUMN "resolution" integer DEFAULT 8;