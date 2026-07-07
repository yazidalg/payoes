CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'open', 'paid', 'void');
--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'past_due');
--> statement-breakpoint
CREATE TYPE "public"."billing_interval" AS ENUM('month', 'year');
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"environment" "environment_mode" DEFAULT 'sandbox' NOT NULL,
	"customer_id" uuid NOT NULL,
	"amount" text NOT NULL,
	"asset" "payment_asset" NOT NULL,
	"description" text,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"interval" "billing_interval" DEFAULT 'month' NOT NULL,
	"interval_count" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb,
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"environment" "environment_mode" DEFAULT 'sandbox' NOT NULL,
	"customer_id" uuid NOT NULL,
	"subscription_id" uuid,
	"checkout_session_id" uuid,
	"amount" text NOT NULL,
	"asset" "payment_asset" NOT NULL,
	"description" text,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"metadata" jsonb,
	"due_at" timestamp with time zone,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "invoice_id" uuid;
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "subscription_id" uuid;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_checkout_session_id_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."subscriptions"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_public_id_idx" ON "subscriptions" USING btree ("public_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_public_id_idx" ON "invoices" USING btree ("public_id");
