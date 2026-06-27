/**
 * Cookie auth token for the operator gate (/dashboard, /pipeline, /admin) and
 * the operator-only mutation routes.
 *
 * The session cookie holds an opaque SHA-256 token derived from DEMO_PASSWORD —
 * NOT the password itself. This keeps the literal credential out of every
 * authenticated browser's cookie jar, network logs, and shared HAR files, so a
 * leaked cookie can't be replayed as the password if a real one is ever set.
 *
 * Everything here uses the Web Crypto API (globalThis.crypto), which is
 * available in both the Edge runtime (proxy.ts) and Node route handlers, so the
 * exact same token is produced on both sides.
 *
 * Open demo: DEMO_PASSWORD is optional. When unset it falls back to the
 * published demo password (DEMO_PASSWORD_DEFAULT) — printed on /login and in the
 * README — so the gate works in every environment without extra config. Set
 * DEMO_PASSWORD to override it for a non-public deployment.
 */

export const AUTH_COOKIE = "dh-auth";

/**
 * Published demo password. Intentionally public (shown on /login + README); the
 * gate exists to deter drive-by bots, not determined users. Override per
 * deployment with the DEMO_PASSWORD env var.
 */
export const DEMO_PASSWORD_DEFAULT = "distress2026";

/** Active gate password: the DEMO_PASSWORD env override, else the demo default. */
export function gatePassword(): string {
  return process.env.DEMO_PASSWORD ?? DEMO_PASSWORD_DEFAULT;
}

/** Derive the opaque session token for a given password. */
export async function authTokenFor(password: string): Promise<string> {
  const data = new TextEncoder().encode(`dh.auth.v1:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time comparison of two equal-length hex strings. */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Read a single cookie value from a standard Request's Cookie header. */
function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return undefined;
}

/**
 * True iff the request carries a valid operator auth cookie — a cookie whose
 * token matches the active gate password (env override or demo default).
 * Returns false when the cookie is missing or wrong.
 *
 * Use to gate operator-only mutation routes (they are NOT covered by proxy.ts,
 * which only matches page paths).
 */
export async function isOperatorRequest(req: Request): Promise<boolean> {
  const password = gatePassword();
  const cookie = readCookie(req, AUTH_COOKIE);
  if (!cookie) return false;
  try {
    const expected = await authTokenFor(password);
    return timingSafeEqualHex(cookie, expected);
  } catch {
    return false;
  }
}
