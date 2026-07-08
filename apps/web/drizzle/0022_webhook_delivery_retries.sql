ALTER TYPE "public"."webhook_event" ADD VALUE IF NOT EXISTS 'webhook.test';
--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD COLUMN IF NOT EXISTS "next_retry_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD COLUMN IF NOT EXISTS "last_error" text;
