CREATE TABLE "accesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"teacher_id" uuid NOT NULL,
	"framework_id" uuid NOT NULL,
	"name" text NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accesses_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"access_id" uuid NOT NULL,
	"display_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "access_id" uuid;--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "student_id" uuid;--> statement-breakpoint
ALTER TABLE "accesses" ADD CONSTRAINT "accesses_teacher_id_teachers_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."teachers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accesses" ADD CONSTRAINT "accesses_framework_id_frameworks_id_fk" FOREIGN KEY ("framework_id") REFERENCES "public"."frameworks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_access_id_accesses_id_fk" FOREIGN KEY ("access_id") REFERENCES "public"."accesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accesses_teacher_idx" ON "accesses" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "students_access_idx" ON "students" USING btree ("access_id");--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_access_id_accesses_id_fk" FOREIGN KEY ("access_id") REFERENCES "public"."accesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "conversations_student_idx" ON "conversations" USING btree ("student_id","updated_at");