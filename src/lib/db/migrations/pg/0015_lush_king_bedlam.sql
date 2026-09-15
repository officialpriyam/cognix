CREATE TABLE "cognix_chat_memory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" text,
	"kind" text DEFAULT 'summary' NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cognix_session_message" (
	"id" text PRIMARY KEY NOT NULL,
	"session_id" text NOT NULL,
	"role" text NOT NULL,
	"parts" json NOT NULL,
	"meta" json,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cognix_session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"model" json,
	"meta" json,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cognix_chat_memory" ADD CONSTRAINT "cognix_chat_memory_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cognix_session_message" ADD CONSTRAINT "cognix_session_message_session_id_cognix_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."cognix_session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cognix_session" ADD CONSTRAINT "cognix_session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cognix_chat_memory_user_idx" ON "cognix_chat_memory" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "cognix_session_message_session_idx" ON "cognix_session_message" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "cognix_session_user_idx" ON "cognix_session" USING btree ("user_id");