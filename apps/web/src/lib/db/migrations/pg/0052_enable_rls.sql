-- 0052: Enable Row Level Security on every table in the public schema.
--
-- Why: on Supabase the `public` schema is auto-exposed through the PostgREST
-- REST API to the `anon` / `authenticated` roles. Without RLS, anyone holding
-- the project's anon key could read and write every table directly. RLS with
-- no matching policy denies those roles by default.
--
-- The application itself never uses PostgREST: it connects over TCP with
-- postgres.js (see lib/db/pg/db.pg.ts) as the `postgres` role. A permissive
-- `app_full_access` policy for that role (plus the role running this
-- migration, when different) keeps every server-side query working exactly
-- as before. `service_role` bypasses RLS by default and needs no policy.
--
-- Idempotent: safe to re-run (DROP POLICY IF EXISTS + ENABLE RLS are no-ops
-- when already applied). Note: tables created by future migrations need the
-- same treatment; consider adding a follow-up migration per new table or
-- re-running this block.

DO $$
DECLARE
  t text;
  app_role text := current_user;
  extra_role text := '';
BEGIN
  -- Target the standard Supabase direct-connection role, plus the role that
  -- executes this migration when it connects as something custom.
  IF app_role IS DISTINCT FROM 'postgres' AND app_role IS DISTINCT FROM 'public' THEN
    extra_role := format(', %I', app_role);
  END IF;

  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS app_full_access ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY app_full_access ON public.%I FOR ALL TO postgres%s USING (true) WITH CHECK (true)',
      t,
      extra_role
    );
  END LOOP;
END $$;
