ALTER TABLE "organizer_accounts" ALTER COLUMN "business_registration_number" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "organizer_accounts" ALTER COLUMN "tax_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "token_version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "updated_at" timestamp DEFAULT now();