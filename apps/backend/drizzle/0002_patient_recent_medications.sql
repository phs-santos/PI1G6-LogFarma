CREATE TABLE "patient_recent_medications" (
	"patient_id" uuid NOT NULL,
	"medication_id" uuid NOT NULL,
	"viewed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "patient_recent_medications" ADD CONSTRAINT "patient_recent_medications_patient_id_patients_user_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_recent_medications" ADD CONSTRAINT "patient_recent_medications_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "patient_recent_medications_patient_medication" ON "patient_recent_medications" USING btree ("patient_id","medication_id");