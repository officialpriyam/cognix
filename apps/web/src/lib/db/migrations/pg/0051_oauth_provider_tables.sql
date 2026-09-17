-- 0051: better-auth oidc-provider tables. Backs "Log in with Cognix" for
-- first-party apps (desktop client): OAuth applications, issued access /
-- refresh tokens, and recorded consents. All idempotent.

CREATE TABLE IF NOT EXISTS "oauth_application" (
  "id" text PRIMARY KEY NOT NULL,
  "client_id" text NOT NULL UNIQUE,
  "client_secret" text,
  "type" text NOT NULL,
  "name" text NOT NULL,
  "icon" text,
  "metadata" text,
  "disabled" boolean DEFAULT false NOT NULL,
  "redirect_urls" text NOT NULL,
  "user_id" uuid REFERENCES "user"("id") ON DELETE cascade,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "oauth_application_user_id_idx" ON "oauth_application" ("user_id");

CREATE TABLE IF NOT EXISTS "oauth_access_token" (
  "id" text PRIMARY KEY NOT NULL,
  "access_token" text NOT NULL UNIQUE,
  "refresh_token" text NOT NULL UNIQUE,
  "access_token_expires_at" timestamp NOT NULL,
  "refresh_token_expires_at" timestamp NOT NULL,
  "client_id" text NOT NULL REFERENCES "oauth_application"("client_id") ON DELETE cascade,
  "user_id" uuid REFERENCES "user"("id") ON DELETE cascade,
  "scopes" text NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "oauth_access_token_client_id_idx" ON "oauth_access_token" ("client_id");
CREATE INDEX IF NOT EXISTS "oauth_access_token_user_id_idx" ON "oauth_access_token" ("user_id");

CREATE TABLE IF NOT EXISTS "oauth_consent" (
  "id" text PRIMARY KEY NOT NULL,
  "client_id" text NOT NULL REFERENCES "oauth_application"("client_id") ON DELETE cascade,
  "user_id" uuid NOT NULL REFERENCES "user"("id") ON DELETE cascade,
  "scopes" text NOT NULL,
  "consent_given" boolean NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS "oauth_consent_client_id_idx" ON "oauth_consent" ("client_id");
CREATE INDEX IF NOT EXISTS "oauth_consent_user_id_idx" ON "oauth_consent" ("user_id");
