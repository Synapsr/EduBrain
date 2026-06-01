ALTER TABLE "chunks" ALTER COLUMN "framework_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "framework_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "chunks" ADD COLUMN "conversation_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "conversation_id" uuid;--> statement-breakpoint
ALTER TABLE "chunks" ADD CONSTRAINT "chunks_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chunks_conversation_idx" ON "chunks" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "documents_conversation_idx" ON "documents" USING btree ("conversation_id");