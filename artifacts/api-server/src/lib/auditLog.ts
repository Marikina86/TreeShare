import { db } from "@workspace/db";
import { adminAuditLogTable } from "@workspace/db";
import { logger } from "./logger";

export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: string,
  targetId?: string | number | null,
  metadata?: Record<string, unknown> | null,
): Promise<void> {
  try {
    await db.insert(adminAuditLogTable).values({
      adminId,
      action,
      targetType,
      targetId: targetId != null ? String(targetId) : null,
      metadata: metadata ?? null,
    });
  } catch (err) {
    logger.warn({ err, adminId, action, targetType, targetId }, "Failed to write admin audit log (non-fatal)");
  }
}
