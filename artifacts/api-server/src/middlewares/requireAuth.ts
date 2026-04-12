import { type Request, type Response, type NextFunction } from "express";
import { createHmac } from "crypto";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthenticatedRequest extends Request {
  userId: string;
}

const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "";

if (!JWT_SECRET) {
  console.error("[requireAuth] FATAL: SUPABASE_JWT_SECRET is not set — all auth requests will be rejected");
}

function base64UrlDecode(str: string): Buffer {
  let s = str.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4 !== 0) s += "=";
  return Buffer.from(s, "base64");
}

function verifySupabaseJwt(token: string): string | null {
  if (!JWT_SECRET) return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, sigB64] = parts;

    const header = JSON.parse(base64UrlDecode(headerB64).toString("utf-8")) as { alg?: string };
    if (header.alg !== "HS256") {
      console.warn("[requireAuth] Unexpected JWT algorithm:", header.alg);
      return null;
    }

    const expectedSig = createHmac("sha256", JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest();

    const actualSig = base64UrlDecode(sigB64);

    if (expectedSig.length !== actualSig.length) return null;

    let match = true;
    for (let i = 0; i < expectedSig.length; i++) {
      if (expectedSig[i] !== actualSig[i]) match = false;
    }
    if (!match) {
      console.warn("[requireAuth] JWT signature verification failed");
      return null;
    }

    const payload = JSON.parse(
      base64UrlDecode(payloadB64).toString("utf-8")
    ) as { sub?: string; exp?: number; aud?: string; role?: string };

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.warn("[requireAuth] JWT expired");
      return null;
    }

    return payload.sub ?? null;
  } catch (err) {
    console.error("[requireAuth] verifySupabaseJwt error:", err);
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
    userId = verifySupabaseJwt(authHeader.slice(7));
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
  }

  (req as AuthenticatedRequest).userId = userId;
  next();
};
