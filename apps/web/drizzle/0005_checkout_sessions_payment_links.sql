CREATE TYPE "public"."checkout_session_status" AS ENUM('open', 'complete', 'expired');
--> statement-breakpoint
CREATE TYPE "public"."payment_source_type" AS ENUM('direct', 'checkout_session', 'payment_link', 'invoice', 'subscription');
--> statement-breakpoint
CREATE TABLE "payment_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"environment" "environment_mode" DEFAULT 'sandbox' NOT NULL,
	"amount" text NOT NULL,
	"asset" "payment_asset" NOT NULL,
	"description" text,
	"active" integer DEFAULT 1 NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"customer_id" uuid,
	"status" "checkout_session_status" DEFAULT 'open' NOT NULL,
	"success_url" text,
	"cancel_url" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "source_type" "payment_source_type" DEFAULT 'direct' NOT NULL;
--> statement-breakpoint
ALTER TABLE "payments" ADD COLUMN "payment_link_id" uuid;
--> statement-breakpoint
ALTER TABLE "payment_links" ADD CONSTRAINT "payment_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_payment_link_id_payment_links_id_fk" FOREIGN KEY ("payment_link_id") REFERENCES "public"."payment_links"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "checkout_sessions_public_id_idx" ON "checkout_sessions" USING btree ("public_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "payment_links_public_id_idx" ON "payment_links" USING btree ("public_id");
