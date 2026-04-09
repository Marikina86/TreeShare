import { type Request, type Response, type NextFunction } from "express";
import { createPublicKey, createVerify, type KeyObject } from "crypto";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthenticatedRequest extends Request {
  userId: string;
}

// ---------------------------------------------------------------------------
// JWKS cache — populated dynamically from Clerk's public endpoint.
// No secret key required; Clerk's JWKS is publicly accessible.
// ---------------------------------------------------------------------------
const CLERK_JWKS_URL = "https://humane-cod-19.clerk.accounts.dev/.well-known/jwks.json";

const publicKeyCache = new Map<string, KeyObject>();
let lastFetchAt = 0;
const FETCH_COOLDOWN_MS = 60_000; // don't refetch more than once per minute

async function fetchJwks(): Promise<void> {
  const now = Date.now();
  if (now - lastFetchAt < FETCH_COOLDOWN_MS) return; // rate-limit refreshes
  lastFetchAt = now;
  try {
    const res = await fetch(CLERK_JWKS_URL, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return;
    const data = (await res.json()) as {
      keys: Array<{ kid: string; kty: string; n: string; e: string }>;
    };
    for (const jwk of data.keys) {
      if (publicKeyCache.has(jwk.kid)) continue;
      try {
        const key = createPublicKey({
          key: { kty: jwk.kty, n: jwk.n, e: jwk.e },
          format: "jwk",
        });
        publicKeyCache.set(jwk.kid, key);
        console.info(`[requireAuth] Cached Clerk key kid="${jwk.kid}"`);
      } catch (err) {
        console.error(`[requireAuth] Failed to parse key kid="${jwk.kid}":`, err);
      }
    }
  } catch (err) {
    console.warn("[requireAuth] JWKS fetch failed:", (err as Error)?.message ?? err);
  }
}

// Fetch eagerly at module load so the first request doesn't have to wait.
fetchJwks().catch(() => {});

async function verifyClerkJwt(token: string): Promise<string | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;

    const header = JSON.parse(
      Buffer.from(headerB64, "base64url").toString("utf-8")
    ) as { kid?: string; alg?: string };

    const kid = header.kid;
    if (!kid) return null;

    // If the kid is unknown, try to refresh JWKS once before giving up.
    if (!publicKeyCache.has(kid)) {
      console.info(`[requireAuth] Unknown kid="${kid}", refreshing JWKS…`);
      lastFetchAt = 0; // force refetch (bypass cooldown)
      await fetchJwks();
    }

    const publicKey = publicKeyCache.get(kid);
    if (!publicKey) {
      console.warn(`[requireAuth] kid="${kid}" not found after JWKS refresh — keys may need updating`);
      return null;
    }

    const verifier = createVerify("RSA-SHA256");
    verifier.update(`${headerB64}.${payloadB64}`);
    const signature = Buffer.from(sigB64, "base64url");
    if (!verifier.verify(publicKey, signature)) {
      console.warn("[requireAuth] JWT signature verification failed");
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf-8")
    ) as { sub?: string; exp?: number; nbf?: number };

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.warn("[requireAuth] JWT expired");
      return null;
    }
    if (payload.nbf && payload.nbf > now + 30) {
      console.warn("[requireAuth] JWT not yet valid (nbf)");
      return null;
    }

    return payload.sub ?? null;
  } catch (err) {
    console.error("[requireAuth] verifyClerkJwt error:", err);
    return null;
  }
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;
  let userId: string | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    userId = await verifyClerkJwt(authHeader.slice(7));
  }

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const [user] = await db
      .select({ isBlocked: usersTable.isBlocked })
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, userId));

    if (user?.isBlocked) {
      res.status(403).json({ error: "Account blocked", code: "ACCOUNT_BLOCKED" });
      return;
    }
  } catch {
    // If the DB check fails, allow through
  }

  (req as AuthenticatedRequest).userId = userId;
  next();
};
