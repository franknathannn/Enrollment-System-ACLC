-- Add QVR/ESC Certificate voucher tracking columns
ALTER TABLE "public"."students" ADD COLUMN IF NOT EXISTS "has_voucher_cert" boolean DEFAULT false;
ALTER TABLE "public"."students" ADD COLUMN IF NOT EXISTS "voucher_cert_url" text;
ALTER TABLE "public"."students" ADD COLUMN IF NOT EXISTS "voucher_status" text DEFAULT 'No Voucher';
