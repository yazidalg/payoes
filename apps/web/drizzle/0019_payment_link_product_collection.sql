ALTER TABLE "payment_links" ADD COLUMN "product_name" text;
--> statement-breakpoint
ALTER TABLE "payment_links" ADD COLUMN "product_description" text;
--> statement-breakpoint
ALTER TABLE "payment_links" ADD COLUMN "customer_collection" jsonb DEFAULT '{"collect_customer_name":false,"collect_business_name":false,"collect_customer_address":false,"require_phone_number":false}'::jsonb NOT NULL;
