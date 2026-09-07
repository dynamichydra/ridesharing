ALTER TABLE "corporate_invoice_items" DROP CONSTRAINT "corporate_invoice_items_invoice_id_corporate_invoices_id_fkey";--> statement-breakpoint
ALTER TABLE "corporate_invoices" DROP CONSTRAINT "corporate_invoices_Jz3jwcJkiCDR_fkey";--> statement-breakpoint
ALTER TABLE "corporate_payments" DROP CONSTRAINT "corporate_payments_CWH4cqUwn82A_fkey";--> statement-breakpoint
ALTER TABLE "corporate_payments" DROP CONSTRAINT "corporate_payments_invoice_id_corporate_invoices_id_fkey";--> statement-breakpoint
ALTER TABLE "corporate_users" DROP CONSTRAINT "corporate_users_corporate_account_id_corporate_accounts_id_fkey";--> statement-breakpoint
DROP TABLE "corporate_accounts";--> statement-breakpoint
DROP TABLE "corporate_invoice_items";--> statement-breakpoint
DROP TABLE "corporate_invoices";--> statement-breakpoint
DROP TABLE "corporate_payments";--> statement-breakpoint
DROP TABLE "corporate_users";--> statement-breakpoint
DROP TABLE "ride_fare_splits";--> statement-breakpoint
DROP TYPE "fare_split_payment_status";--> statement-breakpoint
DROP TYPE "fare_split_status";