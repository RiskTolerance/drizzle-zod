CREATE TYPE "public"."photo_category" AS ENUM('profile', 'medical', 'x-ray');--> statement-breakpoint
CREATE TYPE "public"."speciesEnum" AS ENUM('canine', 'feline', 'avian', 'reptile', 'small_mammal', 'equine', 'exotic');--> statement-breakpoint
CREATE TABLE "clients" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "clients_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"zip" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp,
	CONSTRAINT "clients_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "emergency_contacts" (
	"id" integer GENERATED ALWAYS AS IDENTITY (sequence name "emergency_contacts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"client_id" integer NOT NULL,
	"priority" integer NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"client_relationship" text,
	"phone" text NOT NULL,
	"email" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "patient_photos" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "patient_photos_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"patient_id" integer NOT NULL,
	"photo_category" "photo_category" NOT NULL,
	"image_path" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"notes" text,
	"soft_delete" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "patients_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"client_id" integer NOT NULL,
	"name" text NOT NULL,
	"species" "speciesEnum" NOT NULL,
	"breed" text,
	"color" text,
	"sex" text NOT NULL,
	"date_of_birth" timestamp,
	"approximate_age" text,
	"microchip_number" text,
	"rabies_tag" text,
	"weight_kg" real,
	"weight_updated_at" timestamp,
	"species_data" jsonb,
	"is_deceased" boolean DEFAULT false NOT NULL,
	"deceased_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_photos" ADD CONSTRAINT "patient_photos_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_primary_photo_per_patient" ON "patient_photos" USING btree ("patient_id") WHERE "patient_photos"."is_primary" = true;