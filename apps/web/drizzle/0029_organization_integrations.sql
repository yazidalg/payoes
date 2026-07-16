CREATE TYPE "public"."integration_provider" AS ENUM('shopify', 'woocommerce');
--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('pending', 'connected', 'disconnected', 'error');
--> statement-breakpoint
CREATE TABLE "organization_integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"environment" "environment_mode" DEFAULT 'sandbox' NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"status" "integration_status" DEFAULT 'pending' NOT NULL,
	"store_identifier" text NOT NULL,
	"credentials" jsonb,
	"webhook_secret" text,
	"external_webhook_id" text,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"last_error" text,
	"connected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integration_order_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"external_order_id" text NOT NULL,
	"payment_id" uuid NOT NULL,
	"checkout_url" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organization_integrations" ADD CONSTRAINT "organization_integrations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "integration_order_links" ADD CONSTRAINT "integration_order_links_integration_id_organization_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."organization_integrations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "integration_order_links" ADD CONSTRAINT "integration_order_links_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "organization_integrations_org_env_provider_idx" ON "organization_integrations" USING btree ("organization_id","environment","provider");
--> statement-breakpoint
CREATE UNIQUE INDEX "integration_order_links_integration_order_idx" ON "integration_order_links" USING btree ("integration_id","external_order_id");
