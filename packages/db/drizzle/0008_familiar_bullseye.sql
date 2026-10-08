CREATE TABLE "levels" (
	"guild_id" text NOT NULL,
	"user_id" text NOT NULL,
	"xp" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "levels_guild_id_user_id_pk" PRIMARY KEY("guild_id","user_id")
);
--> statement-breakpoint
CREATE INDEX "levels_guild_xp_idx" ON "levels" USING btree ("guild_id","xp");