CREATE TYPE "payment_flow" AS ENUM ('direct', 'soroban');
CREATE TYPE "blockchain_status" AS ENUM ('not_started', 'submitted', 'confirmed', 'failed');
CREATE TYPE "stellar_transaction_kind" AS ENUM ('classic_payment', 'soroban_payment', 'refund', 'payout', 'unknown');
CREATE TYPE "stellar_sync_source" AS ENUM ('soroban_events', 'horizon_operations');
CREATE TYPE "soroban_contract_status" AS ENUM ('active', 'retired');

ALTER TABLE "payments" ADD COLUMN "payment_flow" "payment_flow" DEFAULT 'direct' NOT NULL;
ALTER TABLE "payments" ADD COLUMN "blockchain_status" "blockchain_status" DEFAULT 'not_started' NOT NULL;
ALTER TABLE "payments" ADD COLUMN "soroban_contract_id" text;
ALTER TABLE "payments" ADD COLUMN "platform_fee_amount" text DEFAULT '0' NOT NULL;
ALTER TABLE "payments" ADD COLUMN "merchant_settlement_amount" text;
ALTER TABLE "payments" ADD COLUMN "payment_authorization_hash" text;

CREATE TABLE "soroban_contract_deployments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "environment" "environment_mode" NOT NULL,
  "contract_id" text NOT NULL,
  "wasm_hash" text NOT NULL,
  "version" text NOT NULL,
  "status" "soroban_contract_status" DEFAULT 'active' NOT NULL,
  "deployed_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "stellar_transactions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL,
  "payment_id" uuid,
  "environment" "environment_mode" NOT NULL,
  "tx_hash" text NOT NULL,
  "ledger_sequence" bigint,
  "source_account" text,
  "transaction_kind" "stellar_transaction_kind" DEFAULT 'unknown' NOT NULL,
  "contract_id" text,
  "raw_transaction" jsonb,
  "confirmed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "stellar_transactions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade,
  CONSTRAINT "stellar_transactions_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE set null
);

CREATE TABLE "soroban_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "stellar_transaction_id" uuid NOT NULL,
  "environment" "environment_mode" NOT NULL,
  "contract_id" text NOT NULL,
  "event_id" text NOT NULL,
  "topic" text NOT NULL,
  "payload" jsonb NOT NULL,
  "ledger_sequence" bigint,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "soroban_events_stellar_transaction_id_stellar_transactions_id_fk" FOREIGN KEY ("stellar_transaction_id") REFERENCES "stellar_transactions"("id") ON DELETE cascade
);

CREATE TABLE "stellar_sync_cursors" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "environment" "environment_mode" NOT NULL,
  "source_type" "stellar_sync_source" NOT NULL,
  "source_identifier" text NOT NULL,
  "cursor" text NOT NULL,
  "last_synced_at" timestamp with time zone,
  "last_error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "soroban_contract_deployments_environment_contract_idx" ON "soroban_contract_deployments" USING btree ("environment", "contract_id");
CREATE UNIQUE INDEX "stellar_transactions_environment_tx_hash_idx" ON "stellar_transactions" USING btree ("environment", "tx_hash");
CREATE INDEX "stellar_transactions_organization_environment_created_idx" ON "stellar_transactions" USING btree ("organization_id", "environment", "created_at");
CREATE INDEX "stellar_transactions_payment_id_idx" ON "stellar_transactions" USING btree ("payment_id");
CREATE UNIQUE INDEX "soroban_events_environment_event_id_idx" ON "soroban_events" USING btree ("environment", "event_id");
CREATE INDEX "soroban_events_contract_ledger_idx" ON "soroban_events" USING btree ("contract_id", "ledger_sequence");
CREATE UNIQUE INDEX "stellar_sync_cursors_environment_source_idx" ON "stellar_sync_cursors" USING btree ("environment", "source_type", "source_identifier");