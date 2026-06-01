CREATE TABLE "frameworks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"subject" text DEFAULT '' NOT NULL,
	"level" text DEFAULT '' NOT NULL,
	"program_link" text DEFAULT '' NOT NULL,
	"persona" text DEFAULT '' NOT NULL,
	"tone" text DEFAULT '' NOT NULL,
	"do_rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"dont_rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visibility" text DEFAULT 'private' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "frameworks" ADD CONSTRAINT "frameworks_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "frameworks_teacher_idx" ON "frameworks" USING btree ("teacher_id","updated_at");--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_framework_id_frameworks_id_fk" FOREIGN KEY ("framework_id") REFERENCES "public"."frameworks"("id") ON DELETE set null ON UPDATE no action;