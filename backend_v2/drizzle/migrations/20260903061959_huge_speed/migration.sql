ALTER TABLE "credit_transactions" DROP CONSTRAINT "credit_transactions_credit_id_credits_id_fkey";--> statement-breakpoint
ALTER TABLE "pricing_versions" DROP CONSTRAINT "pricing_versions_pricing_profile_id_pricing_profiles_id_fkey";--> statement-breakpoint
ALTER TABLE "promo_credits" DROP CONSTRAINT "promo_credits_campaign_id_promotion_campaigns_id_fkey";--> statement-breakpoint
ALTER TABLE "promo_redemptions" DROP CONSTRAINT "promo_redemptions_campaign_id_promotion_campaigns_id_fkey";--> statement-breakpoint
ALTER TABLE "promotion_rules" DROP CONSTRAINT "promotion_rules_campaign_id_promotion_campaigns_id_fkey";--> statement-breakpoint
ALTER TABLE "settlement_items" DROP CONSTRAINT "settlement_items_settlement_id_settlements_id_fkey";--> statement-breakpoint
DROP TABLE "credit_transactions";--> statement-breakpoint
DROP TABLE "credits";--> statement-breakpoint
DROP TABLE "payment_country_rules";--> statement-breakpoint
DROP TABLE "payout_schedules";--> statement-breakpoint
DROP TABLE "pricing_profiles";--> statement-breakpoint
DROP TABLE "promo_credits";--> statement-breakpoint
DROP TABLE "promo_redemptions";--> statement-breakpoint
DROP TABLE "promotion_campaigns";--> statement-breakpoint
DROP TABLE "promotion_rules";--> statement-breakpoint
DROP TABLE "settlement_items";--> statement-breakpoint
DROP TABLE "settlements";