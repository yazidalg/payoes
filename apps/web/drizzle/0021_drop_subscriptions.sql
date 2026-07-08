UPDATE "payments" SET "source_type" = 'invoice' WHERE "source_type" = 'subscription';
--> statement-breakpoint
ALTER TABLE "payments" DROP COLUMN IF EXISTS "subscription_id";
--> statement-breakpoint
ALTER TABLE "invoices" DROP COLUMN IF EXISTS "subscription_id";
--> statement-breakpoint
DROP TABLE IF EXISTS "subscriptions";
--> statement-breakpoint
DROP TYPE IF EXISTS "subscription_status";
--> statement-breakpoint
DROP TYPE IF EXISTS "billing_interval";
--> statement-breakpoint
CREATE TYPE "public"."payment_source_type_new" AS ENUM('direct', 'checkout_session', 'payment_link', 'invoice');
--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "source_type" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "source_type" TYPE "payment_source_type_new" USING ("source_type"::text::"payment_source_type_new");
--> statement-breakpoint
DROP TYPE "payment_source_type";
--> statement-breakpoint
ALTER TYPE "payment_source_type_new" RENAME TO "payment_source_type";
--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "source_type" SET DEFAULT 'direct';
