ALTER TYPE "payment_flow" ADD VALUE IF NOT EXISTS 'escrow';
ALTER TYPE "payment_status" ADD VALUE IF NOT EXISTS 'deposit_received';
ALTER TYPE "payment_status" ADD VALUE IF NOT EXISTS 'settling';
ALTER TYPE "payment_status" ADD VALUE IF NOT EXISTS 'settlement_failed';
ALTER TYPE "payment_status" ADD VALUE IF NOT EXISTS 'refunding';
ALTER TYPE "payment_status" ADD VALUE IF NOT EXISTS 'refunded';
ALTER TYPE "webhook_event" ADD VALUE IF NOT EXISTS 'payment.refunded';
ALTER TYPE "webhook_event" ADD VALUE IF NOT EXISTS 'payment.settlement_failed';

ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "deposit_address" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "deposit_tx_hash" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "settlement_tx_hash" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "refund_tx_hash" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "received_amount" text;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "refund_reason" text;
