-- 0053: drop FKs from oauth token/consent client_id to oauth_application.
--
-- Why: better-auth trusted OAuth clients (e.g. the "cognix-desktop" public
-- client used by "Log in with Cognix") live in server config and never get a
-- row in oauth_application. The FK therefore rejects every access token the
-- token endpoint tries to persist for them, surfacing as HTTP 500 on
-- POST /api/auth/oauth2/token with a perfectly valid authorization code.
--
-- Dynamically registered applications DO have table rows, so lookups keep
-- working; only the hard DB-level constraint is removed. client_id stays
-- NOT NULL and indexed on both tables.
--
-- Idempotent: the DO block drops whatever FK constraints exist on those two
-- client_id columns (whatever they happen to be named) and is a no-op when
-- none exist.

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.conname AS name, c.conrelid::regclass AS tbl
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid
     AND a.attnum = ANY (c.conkey)
    WHERE c.contype = 'f'
      AND c.conrelid IN ('oauth_access_token'::regclass, 'oauth_consent'::regclass)
      AND a.attname = 'client_id'
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tbl, r.name);
  END LOOP;
END $$;
