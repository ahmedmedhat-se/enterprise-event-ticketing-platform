CREATE TYPE "public"."approval_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('pending', 'confirmed', 'cancelled', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('seated', 'general_admission');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('succeeded', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."seat_status" AS ENUM('available', 'held', 'booked');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('valid', 'cancelled', 'checked_in');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('fan', 'organizer', 'admin');--> statement-breakpoint
CREATE TYPE "public"."waitlist_status" AS ENUM('waiting', 'offered', 'expired', 'converted');--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'pending'::"public"."booking_status";--> statement-breakpoint
ALTER TABLE "bookings" ALTER COLUMN "status" SET DATA TYPE "public"."booking_status" USING "status"::"public"."booking_status";--> statement-breakpoint
ALTER TABLE "events" ALTER COLUMN "event_type" SET DATA TYPE "public"."event_type" USING "event_type"::"public"."event_type";--> statement-breakpoint
ALTER TABLE "organizer_accounts" ALTER COLUMN "approval_status" SET DEFAULT 'pending'::"public"."approval_status";--> statement-breakpoint
ALTER TABLE "organizer_accounts" ALTER COLUMN "approval_status" SET DATA TYPE "public"."approval_status" USING "approval_status"::"public"."approval_status";--> statement-breakpoint
ALTER TABLE "payment_transactions" ALTER COLUMN "status" SET DATA TYPE "public"."payment_status" USING "status"::"public"."payment_status";--> statement-breakpoint
ALTER TABLE "seats" ALTER COLUMN "status" SET DEFAULT 'available'::"public"."seat_status";--> statement-breakpoint
ALTER TABLE "seats" ALTER COLUMN "status" SET DATA TYPE "public"."seat_status" USING "status"::"public"."seat_status";--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "status" SET DEFAULT 'valid'::"public"."ticket_status";--> statement-breakpoint
ALTER TABLE "tickets" ALTER COLUMN "status" SET DATA TYPE "public"."ticket_status" USING "status"::"public"."ticket_status";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'fan'::"public"."user_role";--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "role" SET DATA TYPE "public"."user_role" USING "role"::"public"."user_role";--> statement-breakpoint
ALTER TABLE "waitlist" ALTER COLUMN "status" SET DEFAULT 'waiting'::"public"."waitlist_status";--> statement-breakpoint
ALTER TABLE "waitlist" ALTER COLUMN "status" SET DATA TYPE "public"."waitlist_status" USING "status"::"public"."waitlist_status";