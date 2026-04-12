import { type Request, type Response, type NextFunction } from "express";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export interface AuthenticatedRequest extends Request {
  userId: string;
}

let _supabase: SupabaseClient | null = null;
let _initAttempted = false;

function getSupabaseAdmin(): SupabaseClient | null {
  if (_supabase) return _supabase;
  if (_initAttempted) return null;
  _initAttempted = true;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("[requireAuth] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set", { urlSet: !!url, keySet: !!key });
    return null;
  }

  console.log("[requireAuth] Initializing Supabase client with URL:", url.substring(0, 40));

  try {
    _supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    return _supabase;
  } catch (err) {
    console.error("[requireAuth] Failed to create Supabase client:", err);
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

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const { data, error } = await supabase.auth.getUser(token);
      if (error) {
        console.error("[requireAuth] getUser error:", error.message, "token prefix:", token.substring(0, 20));
      }
      if (!error && data.user) {
        userId = data.user.id;
      }
    } catch (err) {
      console.error("[requireAuth] token verification error:", err);
    }
  } else {
    if (authHeader) {
      console.warn("[requireAuth] Auth header present but not Bearer:", authHeader.substring(0, 30));
    }
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
