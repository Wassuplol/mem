CREATE TABLE "mod_cases" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"case_number" integer NOT NULL,
	"action" text NOT NULL,
	"target_id" text NOT NULL,
	"moderator_id" text NOT NULL,
	"reason" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "mod_cases_guild_number_idx" ON "mod_cases" USING btree ("guild_id","case_number");--> statement-breakpoint
CREATE INDEX "mod_cases_guild_target_idx" ON "mod_cases" USING btree ("guild_id","target_id");