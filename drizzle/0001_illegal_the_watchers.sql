ALTER TABLE "clients" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "patient_photos" RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD PRIMARY KEY ("id");