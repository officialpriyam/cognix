/**
 * Resolves the PostgreSQL connection string from any of the common
 * environment-variable conventions:
 *
 * 0. DB_MIGRATION_URL                      (optional dedicated migrations URL —
 *                                          only used by runMigrate/getMigrationStatus,
 *                                          see getMigrationDbUrl)
 * 1. DATABASE_URL                          (generic / Supabase / Heroku)
 * 2. POSTGRES_URL                          (Vercel / Neon integration)
 * 3. POSTGRES_URL_NON_POOLING              (Supabase direct / migration URL)
 * 4. SUPABASE_DB_URL                       (Supabase custom naming)
 * 5. POSTGRES_HOST + POSTGRES_USER + POSTGRES_PASSWORD + POSTGRES_DATABASE
 *    or PGHOST + PGUSER + PGPASSWORD + PGDATABASE (+ PGPORT)
 *    (Neon / Vercel split vars, Supabase pooler, plain libpq convention)
 *
 * Hosted providers (Neon, Supabase, Render, ...) almost always require TLS,
 * so SSL is enabled automatically for non-local hosts unless the URL already
 * carries an explicit sslmode.
 */

export interface ResolvedDbUrl {
  url: string;
  /** Which env var(s) the URL was derived from. */
  source: string;
  /** True when SSL was injected because the host is remote. */
  sslInjected: boolean;
}

const LOCAL_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
  "host.docker.internal",
  "postgres",
  "db",
  "pgbouncer",
]);

/** Standard libpq `sslmode=require` compatibility for managed PostgreSQL TLS. */
const LIBPQ_COMPAT = "uselibpqcompat=true";

const URL_KEYS = [
  "DATABASE_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
  "SUPABASE_DB_URL",
] as const;

/** URL used only for schema migrations (direct connection, no pooler). */
const MIGRATION_URL_KEYS = [
  "DB_MIGRATION_URL",
  "POSTGRES_URL_NON_POOLING",
] as const;

const CREDENTIAL_KEYS = [
  [
    "POSTGRES_HOST",
    "POSTGRES_USER",
    "POSTGRES_PASSWORD",
    "POSTGRES_DATABASE",
    "POSTGRES_PORT",
  ],
  ["PGHOST", "PGUSER", "PGPASSWORD", "PGDATABASE", "PGPORT"],
] as const;

function isLocalHost(host: string): boolean {
  const bare = host
    .replace(/^\[|\]$/g, "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  if (LOCAL_HOSTS.has(bare)) return true;
  // Local networks (RFC 1918 / loopback / link-local) are treated as local
  return (
    /^10\./.test(bare) ||
    /^192\.168\./.test(bare) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(bare) ||
    /^127\./.test(bare) ||
    /^169\.254\./.test(bare)
  );
}

function hasExplicitSslMode(url: string): boolean {
  return /(^|[?&])sslmode=/.test(url);
}

function withSsl(url: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}${LIBPQ_COMPAT}&sslmode=require`;
}

/**
 * Builds `postgres://user:password@host:port/database` from split variables
 * and adds sslmode=require for remote hosts.
 */
function buildUrlFromParts(
  host: string,
  user?: string,
  password?: string,
  database?: string,
  port?: string,
): string {
  const auth =
    user || password
      ? `${encodeURIComponent(user ?? "")}:${encodeURIComponent(password ?? "")}@`
      : "";
  const db = database || "postgres";
  const p = port || "5432";
  const url = `postgres://${auth}${host}:${p}/${db}`;
  return isLocalHost(host) ? url : withSsl(url);
}

export function resolveDbUrl(
  env: Record<string, string | undefined> = process.env,
  urlKeys: readonly string[] = URL_KEYS,
  fallback?: ResolvedDbUrl,
): ResolvedDbUrl {
  // 1) Full connection strings take priority
  for (const key of urlKeys) {
    const value = env[key];
    if (value && value.trim() !== "") {
      const url = value.trim();
      const withoutScheme = url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
      // host[:port] is the last segment before the first "/" or "?",
      // after dropping any "user:pass@" userinfo.
      const hostPort = withoutScheme.split(/[/?]/)[0].split("@").pop() ?? "";
      const host = hostPort.replace(/:\d+$/, "");
      const sslInjected = !hasExplicitSslMode(url) && !isLocalHost(host);
      return {
        url: sslInjected ? withSsl(url) : url,
        source: key,
        sslInjected,
      };
    }
  }

  // 2) Split variables (Neon/Supabase style)
  for (const [
    hostKey,
    userKey,
    passwordKey,
    databaseKey,
    portKey,
  ] of CREDENTIAL_KEYS) {
    const host = env[hostKey]?.trim();
    if (host) {
      const url = buildUrlFromParts(
        host,
        env[userKey],
        env[passwordKey],
        env[databaseKey],
        env[portKey],
      );
      return {
        url,
        source: url.includes("sslmode=")
          ? `${hostKey} (ssl injected)`
          : hostKey,
        sslInjected: url.includes("sslmode="),
      };
    }
  }

  // 3) Fall back to the regular app URL when provided
  if (fallback) return fallback;

  throw new Error(
    "No PostgreSQL connection configuration found. " +
      "Set DATABASE_URL (or POSTGRES_URL, or SUPABASE_DB_URL), " +
      "or the split variables POSTGRES_HOST/PGHOST + POSTGRES_USER/PGUSER + " +
      "POSTGRES_PASSWORD/PGPASSWORD + POSTGRES_DATABASE/PGDATABASE.",
  );
}

/** Resolved lazily-cached connection URL for the app database. */
let cached: ResolvedDbUrl | undefined;

export function getDbUrl(): ResolvedDbUrl {
  cached ??= resolveDbUrl();
  return cached;
}

let cachedMigration: ResolvedDbUrl | undefined;

/**
 * Connection URL for schema migrations only. Prefers a dedicated
 * DB_MIGRATION_URL (e.g. Supabase's direct "Session pooler" or
 * POSTGRES_URL_NON_POOLING), falling back to the regular app URL.
 *
 * Why: serverless-friendly transaction poolers (Supabase port 6543,
 * PgBouncer transaction mode) break session-scoped features used by
 * migrations — advisory locks and prepared statements. Migrations need
 * a direct/session connection instead.
 */
export function getMigrationDbUrl(): ResolvedDbUrl {
  cachedMigration ??= resolveDbUrl(process.env, MIGRATION_URL_KEYS, getDbUrl());
  return cachedMigration;
}
