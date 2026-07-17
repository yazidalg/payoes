CREATE TABLE IF NOT EXISTS "horizon_stream_cursors" (
	"environment" "environment_mode" PRIMARY KEY NOT NULL,
	"paging_token" text NOT NULL,
	"last_event_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
