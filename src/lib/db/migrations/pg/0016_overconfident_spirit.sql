ALTER TABLE "mcp_server" ADD COLUMN "tool_info" json;--> statement-breakpoint
ALTER TABLE "mcp_server" ADD COLUMN "tool_info_updated_at" timestamp;--> statement-breakpoint
ALTER TABLE "mcp_server" ADD COLUMN "last_connection_status" varchar;