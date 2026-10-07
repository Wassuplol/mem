CREATE TABLE "poll_votes" (
	"poll_id" text NOT NULL,
	"user_id" text NOT NULL,
	"option_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "poll_votes_poll_id_user_id_option_index_pk" PRIMARY KEY("poll_id","user_id","option_index")
);
--> statement-breakpoint
CREATE TABLE "polls" (
	"id" text PRIMARY KEY NOT NULL,
	"guild_id" text NOT NULL,
	"channel_id" text,
	"message_id" text,
	"author_id" text NOT NULL,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"multiple" boolean DEFAULT false NOT NULL,
	"closed" boolean DEFAULT false NOT NULL,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "poll_votes" ADD CONSTRAINT "poll_votes_poll_id_polls_id_fk" FOREIGN KEY ("poll_id") REFERENCES "public"."polls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "polls_guild_idx" ON "polls" USING btree ("guild_id");--> statement-breakpoint
CREATE INDEX "polls_message_idx" ON "polls" USING btree ("message_id");