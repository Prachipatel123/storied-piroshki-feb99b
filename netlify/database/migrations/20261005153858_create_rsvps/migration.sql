CREATE TABLE "rsvps" (
	"id" serial PRIMARY KEY,
	"name" text NOT NULL,
	"email" text,
	"phone" text,
	"attending" boolean NOT NULL,
	"guest_count" integer DEFAULT 0 NOT NULL,
	"adults" integer DEFAULT 0 NOT NULL,
	"children" integer DEFAULT 0 NOT NULL,
	"attendee_names" text,
	"comments" text,
	"email_sent" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
