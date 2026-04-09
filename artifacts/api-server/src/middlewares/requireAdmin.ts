import { type Request, type Response, type NextFunction } from "express";
import { type AuthenticatedRequest } from "./requireAuth";

export function getAdminIds(): string[] {
  return (process.env.ADMIN_CLERK_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAdmin(clerkUserId: string): boolean {
  return getAdminIds().includes(clerkUserId);
}

export const requireAdmin = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const userId = (req as AuthenticatedRequest).userId;
  if (!userId || !isAdmin(userId)) {
    res.status(403).json({ error: "Forbidden: admin access required" });
    return;
  }
  next();
};
