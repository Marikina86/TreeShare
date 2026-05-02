/**
 * Returns the canonical public origin for this app.
 * Priority:
 * 1. First entry of REPLIT_DOMAINS (the deployed/production domain)
 * 2. REPLIT_DEV_DOMAIN (the persistent dev-preview domain)
 * 3. window.location.origin (fallback for local or unknown environments)
 */
export function getCanonicalOrigin(): string {
  const domains =
    typeof __REPLIT_DOMAINS__ === "string"
      ? __REPLIT_DOMAINS__.split(",").map((d) => d.trim()).filter(Boolean)
      : [];
  if (domains.length) return `https://${domains[0]}`;

  if (typeof __REPLIT_DEV_DOMAIN__ === "string" && __REPLIT_DEV_DOMAIN__)
    return `https://${__REPLIT_DEV_DOMAIN__}`;

  return window.location.origin;
}
