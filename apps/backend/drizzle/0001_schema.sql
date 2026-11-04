CREATE TYPE "public"."administration_route" AS ENUM('oral', 'subcutaneous', 'intramuscular', 'intravenous', 'topical', 'inhalation', 'other');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('scheduled', 'out_for_delivery', 'delivered', 'failed');--> statement-breakpoint
CREATE TYPE "public"."fulfillment" AS ENUM('pickup', 'delivery');--> statement-breakpoint
CREATE TYPE "public"."medication_component" AS ENUM('basic', 'strategic', 'specialized');--> statement-breakpoint
CREATE TYPE "public"."movement_type" AS ENUM('entry_purchase', 'entry_transfer', 'exit_dispensation', 'exit_transfer', 'exit_loss', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."pharmaceutical_form" AS ENUM('tablet', 'capsule', 'oral_solution', 'oral_suspension', 'injectable', 'cream', 'inhaler', 'other');--> statement-breakpoint
CREATE TYPE "public"."pharmacy_kind" AS ENUM('ubs', 'municipal_pharmacy', 'specialized_pharmacy', 'pfpb');--> statement-breakpoint
CREATE TYPE "public"."pharmacy_network" AS ENUM('municipal', 'state', 'pfpb');--> statement-breakpoint
CREATE TYPE "public"."picked_up_by" AS ENUM('patient', 'caregiver', 'delivery');--> statement-breakpoint
CREATE TYPE "public"."prescription_type" AS ENUM('none', 'simple', 'antimicrobial', 'special_control');--> statement-breakpoint
CREATE TYPE "public"."priority_category" AS ENUM('chronic', 'oncology', 'rare_disease');--> statement-breakpoint
CREATE TYPE "public"."purchase_origin" AS ENUM('manual', 'auto_min_stock');--> statement-breakpoint
CREATE TYPE "public"."purchase_status" AS ENUM('placed', 'confirmed', 'no_date', 'shipped', 'received');--> statement-breakpoint
CREATE TYPE "public"."request_status" AS ENUM('requested', 'ready_for_pickup', 'in_transfer', 'waitlisted', 'arrived', 'delivery_scheduled', 'out_for_delivery', 'picked_up', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."staff_occupation" AS ENUM('pharmacist', 'pharmacy_assistant');--> statement-breakpoint
CREATE TYPE "public"."storage_condition" AS ENUM('room_temperature', 'refrigerated');--> statement-breakpoint
CREATE TYPE "public"."transfer_status" AS ENUM('requested', 'shipped', 'received', 'refused');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('patient', 'pharmacy_staff', 'supplier_staff', 'courier', 'manager');--> statement-breakpoint
CREATE TYPE "public"."waitlist_status" AS ENUM('waiting', 'served', 'cancelled');--> statement-breakpoint
CREATE TABLE "caregivers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"full_name" text NOT NULL,
	"document" text NOT NULL,
	"relationship" text NOT NULL,
	"phone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "couriers" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"phone" text NOT NULL,
	"delivery_program" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"method" text DEFAULT 'municipal_program' NOT NULL,
	"courier_id" uuid,
	"scheduled_by_staff_id" uuid NOT NULL,
	"address_snapshot" jsonb NOT NULL,
	"scheduled_window" text NOT NULL,
	"requires_refrigeration" boolean NOT NULL,
	"status" "delivery_status" DEFAULT 'scheduled' NOT NULL,
	"received_by" text,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"picked_up_at" timestamp with time zone,
	"delivered_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "dispensations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"medication_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"dispensed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"staff_user_id" uuid NOT NULL,
	"prescription_id" uuid,
	"picked_up_by" "picked_up_by" NOT NULL,
	"caregiver_id" uuid,
	"partial_reason" text
);
--> statement-breakpoint
CREATE TABLE "medication_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"medication_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"prescription_id" uuid,
	"pharmacy_id" uuid NOT NULL,
	"fulfillment" "fulfillment" NOT NULL,
	"status" "request_status" DEFAULT 'requested' NOT NULL,
	"source_pharmacy_id" uuid,
	"expected_at" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"active_ingredient" text NOT NULL,
	"concentration" text NOT NULL,
	"pharmaceutical_form" "pharmaceutical_form" NOT NULL,
	"route" "administration_route" NOT NULL,
	"dispensing_unit" text NOT NULL,
	"component" "medication_component" NOT NULL,
	"therapeutic_class" text NOT NULL,
	"prescription_type" "prescription_type" NOT NULL,
	"storage" "storage_condition" NOT NULL,
	"in_rename" boolean DEFAULT true NOT NULL,
	"in_farmacia_popular" boolean DEFAULT false NOT NULL,
	"catmat_code" text,
	"search_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"request_id" uuid,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"read_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "patient_priorities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"category" "priority_category" NOT NULL,
	"declared_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"social_name" text,
	"birth_date" date NOT NULL,
	"cns" text NOT NULL,
	"cpf" text,
	"phone" text NOT NULL,
	"address" jsonb NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"reference_pharmacy_id" uuid NOT NULL,
	"mobility_limited" boolean DEFAULT false NOT NULL,
	"notifications_consent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patients_cns_unique" UNIQUE("cns"),
	CONSTRAINT "patients_cpf_unique" UNIQUE("cpf")
);
--> statement-breakpoint
CREATE TABLE "pharmacies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cnes" text,
	"cnpj" text,
	"name" text NOT NULL,
	"kind" "pharmacy_kind" NOT NULL,
	"network" "pharmacy_network" NOT NULL,
	"address" text NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"phone" text NOT NULL,
	"opening_hours" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pharmacy_staff" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"occupation" "staff_occupation" NOT NULL,
	"crf_number" text,
	"crf_state" text
);
--> statement-breakpoint
CREATE TABLE "prescriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patient_id" uuid NOT NULL,
	"medication_id" uuid NOT NULL,
	"type" "prescription_type" NOT NULL,
	"issued_at" date NOT NULL,
	"valid_until" date NOT NULL,
	"prescriber_name" text NOT NULL,
	"prescriber_council" text NOT NULL,
	"prescriber_number" text NOT NULL,
	"prescriber_state" text NOT NULL,
	"continuous_use" boolean DEFAULT false NOT NULL,
	"checked_by_staff_id" uuid,
	"checked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"medication_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"supplier_id" uuid NOT NULL,
	"status" "purchase_status" DEFAULT 'placed' NOT NULL,
	"expected_at" date,
	"origin" "purchase_origin" NOT NULL,
	"invoice_number" text,
	"shipped_batch_number" text,
	"shipped_expiry_date" date,
	"shipped_quantity" integer,
	"shipped_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"medication_id" uuid NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"found_in_network" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_batches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"medication_id" uuid NOT NULL,
	"batch_number" text NOT NULL,
	"expiry_date" date NOT NULL,
	"quantity" integer NOT NULL,
	"manufacturer_cnpj" text,
	"anvisa_registration" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_batches_quantity_non_negative" CHECK ("stock_batches"."quantity" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stock_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"medication_id" uuid NOT NULL,
	"min_quantity" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"type" "movement_type" NOT NULL,
	"quantity" integer NOT NULL,
	"related_id" uuid,
	"staff_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"batch_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_staff" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"supplier_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"cnpj" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid,
	"medication_id" uuid NOT NULL,
	"batch_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"from_pharmacy_id" uuid NOT NULL,
	"to_pharmacy_id" uuid NOT NULL,
	"status" "transfer_status" DEFAULT 'requested' NOT NULL,
	"refusal_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"shipped_at" timestamp with time zone,
	"received_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"role" "user_role" NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "waitlist_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"patient_id" uuid NOT NULL,
	"medication_id" uuid NOT NULL,
	"pharmacy_id" uuid NOT NULL,
	"purchase_order_id" uuid,
	"priority" integer NOT NULL,
	"status" "waitlist_status" DEFAULT 'waiting' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "caregivers" ADD CONSTRAINT "caregivers_patient_id_patients_user_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "couriers" ADD CONSTRAINT "couriers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_request_id_medication_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."medication_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_courier_id_couriers_user_id_fk" FOREIGN KEY ("courier_id") REFERENCES "public"."couriers"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_scheduled_by_staff_id_users_id_fk" FOREIGN KEY ("scheduled_by_staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_request_id_medication_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."medication_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_batch_id_stock_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_staff_user_id_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dispensations" ADD CONSTRAINT "dispensations_caregiver_id_caregivers_id_fk" FOREIGN KEY ("caregiver_id") REFERENCES "public"."caregivers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_requests" ADD CONSTRAINT "medication_requests_patient_id_patients_user_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_requests" ADD CONSTRAINT "medication_requests_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_requests" ADD CONSTRAINT "medication_requests_prescription_id_prescriptions_id_fk" FOREIGN KEY ("prescription_id") REFERENCES "public"."prescriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_requests" ADD CONSTRAINT "medication_requests_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "medication_requests" ADD CONSTRAINT "medication_requests_source_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("source_pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_request_id_medication_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."medication_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_priorities" ADD CONSTRAINT "patient_priorities_patient_id_patients_user_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patients" ADD CONSTRAINT "patients_reference_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("reference_pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_staff" ADD CONSTRAINT "pharmacy_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pharmacy_staff" ADD CONSTRAINT "pharmacy_staff_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_patients_user_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_checked_by_staff_id_users_id_fk" FOREIGN KEY ("checked_by_staff_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_events" ADD CONSTRAINT "search_events_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_events" ADD CONSTRAINT "search_events_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_items" ADD CONSTRAINT "stock_items_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_batch_id_stock_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_staff_user_id_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_batch_id_stock_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_request_id_medication_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."medication_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_staff" ADD CONSTRAINT "supplier_staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_staff" ADD CONSTRAINT "supplier_staff_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_request_id_medication_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."medication_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_batch_id_stock_batches_id_fk" FOREIGN KEY ("batch_id") REFERENCES "public"."stock_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_from_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("from_pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_to_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("to_pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_request_id_medication_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."medication_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_patient_id_patients_user_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_medication_id_medications_id_fk" FOREIGN KEY ("medication_id") REFERENCES "public"."medications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_pharmacy_id_pharmacies_id_fk" FOREIGN KEY ("pharmacy_id") REFERENCES "public"."pharmacies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stock_batches_pharmacy_medication_batch" ON "stock_batches" USING btree ("pharmacy_id","medication_id","batch_number");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_items_pharmacy_medication" ON "stock_items" USING btree ("pharmacy_id","medication_id");