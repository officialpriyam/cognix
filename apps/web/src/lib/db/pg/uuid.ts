const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Fail-closed guard for repository lookups by UUID primary key. URL params
 * and client input reach these queries raw — a non-UUID string (a typo, an
 * emoji slug like /workflow/⚡) makes Postgres throw 22P02 and the route 500.
 * Return false instead so callers serve 403/404.
 */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}
