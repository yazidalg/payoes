ALTER TABLE "webhook_endpoints" ADD COLUMN "environment" "environment_mode" DEFAULT 'sandbox' NOT NULL;
--> statement-breakpoint
ALTER TABLE "api_logs" ADD COLUMN "environment" "environment_mode" DEFAULT 'sandbox' NOT NULL;
