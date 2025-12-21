CREATE TABLE "process_revisions" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"process_id" varchar(255) NOT NULL,
	"revision_number" integer NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"revision_reason" text,
	"editor_id" varchar(255),
	"editor_name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_processes" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"project_id" varchar(255) NOT NULL,
	"wbs" varchar(50) NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"actual_start_date" timestamp,
	"actual_end_date" timestamp,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"current_revision" integer DEFAULT 0 NOT NULL,
	"previous_start_date" timestamp,
	"previous_end_date" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budget_items" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "cost_groups" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "department_groups" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "departments" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "csv_file_name" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "csv_row_number" integer;--> statement-breakpoint
ALTER TABLE "process_revisions" ADD CONSTRAINT "process_revisions_process_id_project_processes_id_fk" FOREIGN KEY ("process_id") REFERENCES "public"."project_processes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "process_revisions" ADD CONSTRAINT "process_revisions_editor_id_users_id_fk" FOREIGN KEY ("editor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_processes" ADD CONSTRAINT "project_processes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;