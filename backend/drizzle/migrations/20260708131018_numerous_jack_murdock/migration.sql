CREATE TABLE "cities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"state_id" uuid NOT NULL,
	"country_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"timezone" varchar(50),
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"name" varchar(100) NOT NULL,
	"iso_code" varchar(2) NOT NULL UNIQUE,
	"dial_code" varchar(8) NOT NULL,
	"currency_code" varchar(3) NOT NULL,
	"default_language_code" varchar(8),
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "document_type_requirements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"document_type_id" uuid NOT NULL,
	"country_id" uuid,
	"city_id" uuid,
	"vehicle_type_id" uuid,
	"is_required" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "document_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code" varchar(60) NOT NULL UNIQUE,
	"requires_front" boolean DEFAULT true,
	"requires_back" boolean DEFAULT false,
	"requires_pdf" boolean DEFAULT false,
	"requires_expiry" boolean DEFAULT true,
	"requires_doc_number" boolean DEFAULT true,
	"max_file_size_mb" integer DEFAULT 10,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE "driver_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL,
	"device_id" varchar(100) NOT NULL,
	"platform" varchar(20),
	"fcm_token" text,
	"ip" varchar(45),
	"last_login_at" timestamp DEFAULT now(),
	"is_revoked" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "driver_devices_driver_id_device_id_unique" UNIQUE("driver_id","device_id")
);
--> statement-breakpoint
CREATE TABLE "driver_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL,
	"document_type_id" uuid NOT NULL,
	"front_url" text,
	"back_url" text,
	"pdf_url" text,
	"document_number" varchar(60),
	"expiry_date" timestamp,
	"status" varchar(20) DEFAULT 'pending',
	"rejection_reason" text,
	"verified_by" uuid,
	"verified_at" timestamp,
	"uploaded_at" timestamp DEFAULT now(),
	CONSTRAINT "driver_documents_driver_id_document_type_id_unique" UNIQUE("driver_id","document_type_id")
);
--> statement-breakpoint
CREATE TABLE "driver_legal_acceptances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL,
	"legal_document_id" uuid NOT NULL,
	"accepted_at" timestamp DEFAULT now(),
	"ip" varchar(45),
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE "driver_onboarding_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"answer_value" jsonb NOT NULL,
	"answered_at" timestamp DEFAULT now(),
	CONSTRAINT "driver_onboarding_answers_driver_id_question_id_unique" UNIQUE("driver_id","question_id")
);
--> statement-breakpoint
CREATE TABLE "driver_vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"driver_id" uuid NOT NULL,
	"vehicle_type_id" uuid NOT NULL,
	"brand" varchar(60),
	"model" varchar(60) NOT NULL,
	"year" varchar(4) NOT NULL,
	"color" varchar(30),
	"registration_number" varchar(20) NOT NULL UNIQUE,
	"vin" varchar(32),
	"seats" integer DEFAULT 4,
	"fuel_type" varchar(20),
	"transmission" varchar(20),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "languages" (
	"code" varchar(8) PRIMARY KEY,
	"name" varchar(60) NOT NULL,
	"native_name" varchar(60) NOT NULL,
	"is_rtl" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"is_default" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "legal_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"type" varchar(20) NOT NULL,
	"version" varchar(20) NOT NULL,
	"country_id" uuid,
	"content_url" text NOT NULL,
	"effective_from" timestamp NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "onboarding_question_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"question_id" uuid NOT NULL,
	"code" varchar(60) NOT NULL,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "onboarding_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"code" varchar(60) NOT NULL UNIQUE,
	"question_type" varchar(20) NOT NULL,
	"is_required" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"country_id" uuid,
	"min_value" integer,
	"max_value" integer,
	"depends_on_question_id" uuid,
	"depends_on_operator" varchar(20),
	"depends_on_value" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"country_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(10),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"entity_type" varchar(60) NOT NULL,
	"entity_id" uuid NOT NULL,
	"field_name" varchar(60) NOT NULL,
	"language_code" varchar(8) NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "translations_entity_type_entity_id_field_name_language_code_unique" UNIQUE("entity_type","entity_id","field_name","language_code")
);
--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "date_of_birth" date;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "gender" varchar(20);--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "referral_code" varchar(20);--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "referred_by_driver_id" uuid;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "preferred_language_code" varchar(8);--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "country_id" uuid;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "state_id" uuid;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "city_id" uuid;--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "registration_status" varchar(30) DEFAULT 'new';--> statement-breakpoint
ALTER TABLE "drivers" ADD COLUMN "registration_step" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "drivers" ALTER COLUMN "phone" SET DATA TYPE varchar(20) USING "phone"::varchar(20);--> statement-breakpoint
ALTER TABLE "drivers" ALTER COLUMN "phone" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_email_key" UNIQUE("email");--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_state_id_states_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id");--> statement-breakpoint
ALTER TABLE "cities" ADD CONSTRAINT "cities_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "document_type_requirements" ADD CONSTRAINT "document_type_requirements_cxx3y3g28h66_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id");--> statement-breakpoint
ALTER TABLE "document_type_requirements" ADD CONSTRAINT "document_type_requirements_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "document_type_requirements" ADD CONSTRAINT "document_type_requirements_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "document_type_requirements" ADD CONSTRAINT "document_type_requirements_F0e93XB07Ary_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "driver_devices" ADD CONSTRAINT "driver_devices_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_document_type_id_document_types_id_fkey" FOREIGN KEY ("document_type_id") REFERENCES "document_types"("id");--> statement-breakpoint
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_verified_by_admins_id_fkey" FOREIGN KEY ("verified_by") REFERENCES "admins"("id");--> statement-breakpoint
ALTER TABLE "driver_legal_acceptances" ADD CONSTRAINT "driver_legal_acceptances_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_legal_acceptances" ADD CONSTRAINT "driver_legal_acceptances_mD9rvuiC7314_fkey" FOREIGN KEY ("legal_document_id") REFERENCES "legal_documents"("id");--> statement-breakpoint
ALTER TABLE "driver_onboarding_answers" ADD CONSTRAINT "driver_onboarding_answers_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_onboarding_answers" ADD CONSTRAINT "driver_onboarding_answers_B2isLKTY35YN_fkey" FOREIGN KEY ("question_id") REFERENCES "onboarding_questions"("id");--> statement-breakpoint
ALTER TABLE "driver_vehicles" ADD CONSTRAINT "driver_vehicles_driver_id_drivers_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id");--> statement-breakpoint
ALTER TABLE "driver_vehicles" ADD CONSTRAINT "driver_vehicles_vehicle_type_id_vehicle_types_id_fkey" FOREIGN KEY ("vehicle_type_id") REFERENCES "vehicle_types"("id");--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_state_id_states_id_fkey" FOREIGN KEY ("state_id") REFERENCES "states"("id");--> statement-breakpoint
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_city_id_cities_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id");--> statement-breakpoint
ALTER TABLE "legal_documents" ADD CONSTRAINT "legal_documents_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "onboarding_question_options" ADD CONSTRAINT "onboarding_question_options_iUnGDfUkqBBM_fkey" FOREIGN KEY ("question_id") REFERENCES "onboarding_questions"("id");--> statement-breakpoint
ALTER TABLE "onboarding_questions" ADD CONSTRAINT "onboarding_questions_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "onboarding_questions" ADD CONSTRAINT "onboarding_questions_YsFfnYQ5b2GU_fkey" FOREIGN KEY ("depends_on_question_id") REFERENCES "onboarding_questions"("id");--> statement-breakpoint
ALTER TABLE "states" ADD CONSTRAINT "states_country_id_countries_id_fkey" FOREIGN KEY ("country_id") REFERENCES "countries"("id");--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_language_code_languages_code_fkey" FOREIGN KEY ("language_code") REFERENCES "languages"("code");