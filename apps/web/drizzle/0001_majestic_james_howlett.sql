CREATE TYPE "public"."environment_mode" AS ENUM('sandbox', 'production');--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "environment" "environment_mode" DEFAULT 'sandbox' NOT NULL;