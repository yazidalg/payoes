ALTER TABLE "api_keys" ADD COLUMN "scopes" jsonb DEFAULT '["apis.all"]'::jsonb NOT NULL;
