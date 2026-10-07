CREATE TABLE "role_panel_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"panel_id" text NOT NULL,
	"role_id" text NOT NULL,
	"emoji" text,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_panels" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"message_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "role_panel_entries" ADD CONSTRAINT "role_panel_entries_panel_id_role_panels_id_fk" FOREIGN KEY ("panel_id") REFERENCES "public"."role_panels"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "role_panel_entries_panel_role_idx" ON "role_panel_entries" USING btree ("panel_id","role_id");--> statement-breakpoint
CREATE INDEX "role_panels_guild_idx" ON "role_panels" USING btree ("guild_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_panels_message_idx" ON "role_panels" USING btree ("message_id");