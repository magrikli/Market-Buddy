CREATE TABLE "companies" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"code" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "department_groups" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"company_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_company_assignments" (
	"user_id" varchar(255) NOT NULL,
	"company_id" varchar(255) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budget_items" ADD COLUMN "previous_approved_values" jsonb;--> statement-breakpoint
ALTER TABLE "budget_revisions" ADD COLUMN "revision_reason" text;--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "group_id" varchar(255);--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "company_id" varchar(255);--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "company_id" varchar(255);--> statement-breakpoint
ALTER TABLE "department_groups" ADD CONSTRAINT "department_groups_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_company_assignments" ADD CONSTRAINT "user_company_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_company_assignments" ADD CONSTRAINT "user_company_assignments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_group_id_department_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."department_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;