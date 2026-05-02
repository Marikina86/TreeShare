import { Router } from "express";
import { db } from "@workspace/db";
import { eventsTable, eventParticipantsTable, usersTable, userNotificationsTable } from "@workspace/db";
import { eq, desc, count, and, lt, or, isNull, isNotNull } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";
import {
  CreateEventBody,
  DeleteEventParams,
  JoinEventParams,
  LeaveEventParams,
  UpdateEventBody,
  UpdateEventParams,
} from "@workspace/api-zod";

const router = Router();

async function formatEvent(
  event: typeof eventsTable.$inferSelect,
  currentUserId: string
) {
  const [user] = await db
    .select({ username: usersTable.username, photoUrl: usersTable.photoUrl })
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, event.userId));

  const [participantResult] = await db
    .select({ count: count() })
    .from(eventParticipantsTable)
    .where(eq(eventParticipantsTable.eventId, event.id));

  const [myParticipation] = await db
    .select({ id: eventParticipantsTable.id })
    .from(eventParticipantsTable)
    .where(
      and(
        eq(eventParticipantsTable.eventId, event.id),
        eq(eventParticipantsTable.userId, currentUserId)
      )
    );

  return {
    id: event.id,
    userId: event.userId,
    username: user?.username ?? "Unknown",
    userPhotoUrl: user?.photoUrl ?? null,
    title: event.title,
    description: event.description ?? null,
    location: event.location,
    address: event.address ?? null,
    city: event.city ?? null,
    province: event.province ?? null,
    eventDate: event.eventDate,
    eventTime: event.eventTime,
    endDate: event.endDate ?? null,
    endTime: event.endTime ?? null,
    moderationStatus: event.moderationStatus,
    moderationMessage: event.moderationMessage ?? null,
    participantCount: participantResult?.count ?? 0,
    isParticipating: !!myParticipation,
    createdAt: event.createdAt.toISOString(),
  };
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

async function deletePastEvents() {
  const today = todayStr();
  await db
    .delete(eventsTable)
    .where(
      or(
        and(isNotNull(eventsTable.endDate), lt(eventsTable.endDate, today)),
        and(isNull(eventsTable.endDate), lt(eventsTable.eventDate, today))
      )
    );
}

router.get("/events", requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    await deletePastEvents();

    const province = typeof req.query.province === "string" ? req.query.province.trim() : undefined;
    const city = typeof req.query.city === "string" ? req.query.city.trim() : undefined;

    const events = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.moderationStatus, "approved"))
      .orderBy(desc(eventsTable.eventDate));

    let filtered = events;
    if (province) {
      filtered = filtered.filter((e) =>
        e.province?.toLowerCase() === province.toLowerCase()
      );
    }
    if (city) {
      filtered = filtered.filter((e) =>
        e.city?.toLowerCase().includes(city.toLowerCase())
      );
    }

    const formatted = await Promise.all(
      filtered.map((e) => formatEvent(e, (req as AuthenticatedRequest).userId))
    );
    res.json(formatted);
  } catch (err) {
    console.error("Failed to list events", err);
    res.status(500).json({ error: "Failed to list events" });
  }
});

router.post("/events", requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid body", details: parsed.error.issues });
    return;
  }
  try {
    const { title, description, location, address, city, province, eventDate, eventTime, endDate, endTime } = parsed.data;
    const [event] = await db
      .insert(eventsTable)
      .values({
        userId: (req as AuthenticatedRequest).userId,
        title,
        description: description ?? null,
        location,
        address: address ?? null,
        city: city ?? null,
        province: province ?? null,
        eventDate,
        eventTime,
        endDate: endDate ?? null,
        endTime: endTime ?? null,
        moderationStatus: "pending",
        moderationMessage: null,
        reviewedBy: null,
        reviewedAt: null,
      })
      .returning();

    const formatted = await formatEvent(event, (req as AuthenticatedRequest).userId);
    res.status(201).json(formatted);
  } catch (err) {
    console.error("Failed to create event", err);
    res.status(500).json({ error: "Failed to create event" });
  }
});

router.patch("/events/:eventId", requireAuth, async (req: AuthenticatedRequest, res) => {
  const paramsParsed = UpdateEventParams.safeParse(req.params);
  if (!paramsParsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  const bodyParsed = UpdateEventBody.safeParse(req.body);
  if (!bodyParsed.success) {
    res.status(400).json({ error: "Invalid body", details: bodyParsed.error.issues });
    return;
  }
  try {
    const [event] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, paramsParsed.data.eventId));

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    if (event.userId !== (req as AuthenticatedRequest).userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const updates: Partial<typeof eventsTable.$inferInsert> = {};
    const body = bodyParsed.data;
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description ?? null;
    if (body.location !== undefined) updates.location = body.location;
    if (body.address !== undefined) updates.address = body.address ?? null;
    if (body.city !== undefined) updates.city = body.city ?? null;
    if (body.province !== undefined) updates.province = body.province ?? null;
    if (body.eventDate !== undefined) updates.eventDate = body.eventDate;
    if (body.eventTime !== undefined) updates.eventTime = body.eventTime;
    if (body.endDate !== undefined) updates.endDate = body.endDate ?? null;
    if (body.endTime !== undefined) updates.endTime = body.endTime ?? null;
    updates.moderationStatus = "pending";
    updates.moderationMessage = null;
    updates.reviewedBy = null;
    updates.reviewedAt = null;

    const [updated] = await db
      .update(eventsTable)
      .set(updates)
      .where(eq(eventsTable.id, event.id))
      .returning();

    const formatted = await formatEvent(updated, (req as AuthenticatedRequest).userId);
    res.json(formatted);
  } catch (err) {
    console.error("Failed to update event", err);
    res.status(500).json({ error: "Failed to update event" });
  }
});

router.delete("/events/:eventId", requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = DeleteEventParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  try {
    const [event] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, parsed.data.eventId));

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    if (event.userId !== (req as AuthenticatedRequest).userId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    await db.delete(eventsTable).where(eq(eventsTable.id, event.id));
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete event" });
  }
});

router.post("/events/:eventId/join", requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = JoinEventParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  try {
    const [event] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, parsed.data.eventId));

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }
    if (event.moderationStatus !== "approved") {
      res.status(403).json({ error: "Event not available" });
      return;
    }

    const [existing] = await db
      .select()
      .from(eventParticipantsTable)
      .where(
        and(
          eq(eventParticipantsTable.eventId, event.id),
          eq(eventParticipantsTable.userId, (req as AuthenticatedRequest).userId)
        )
      );

    if (!existing) {
      await db.insert(eventParticipantsTable).values({
        eventId: event.id,
        userId: (req as AuthenticatedRequest).userId,
      });
    }

    const formatted = await formatEvent(event, (req as AuthenticatedRequest).userId);
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: "Failed to join event" });
  }
});

router.post("/events/:eventId/leave", requireAuth, async (req: AuthenticatedRequest, res) => {
  const parsed = LeaveEventParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid params" });
    return;
  }
  try {
    const [event] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, parsed.data.eventId));

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    await db
      .delete(eventParticipantsTable)
      .where(
        and(
          eq(eventParticipantsTable.eventId, event.id),
          eq(eventParticipantsTable.userId, (req as AuthenticatedRequest).userId)
        )
      );

    const formatted = await formatEvent(event, (req as AuthenticatedRequest).userId);
    res.json(formatted);
  } catch (err) {
    res.status(500).json({ error: "Failed to leave event" });
  }
});

router.get("/admin/events/pending", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 10));
  const offset = (page - 1) * limit;

  try {
    const [events, [totalRow]] = await Promise.all([
      db
        .select({
          id: eventsTable.id,
          userId: eventsTable.userId,
          title: eventsTable.title,
          description: eventsTable.description,
          location: eventsTable.location,
          address: eventsTable.address,
          city: eventsTable.city,
          province: eventsTable.province,
          eventDate: eventsTable.eventDate,
          eventTime: eventsTable.eventTime,
          endDate: eventsTable.endDate,
          endTime: eventsTable.endTime,
          moderationStatus: eventsTable.moderationStatus,
          createdAt: eventsTable.createdAt,
          username: usersTable.username,
          userPhotoUrl: usersTable.photoUrl,
        })
        .from(eventsTable)
        .leftJoin(usersTable, eq(eventsTable.userId, usersTable.clerkUserId))
        .where(eq(eventsTable.moderationStatus, "pending"))
        .orderBy(desc(eventsTable.createdAt))
        .limit(limit)
        .offset(offset),
      db.select({ total: count() }).from(eventsTable).where(eq(eventsTable.moderationStatus, "pending")),
    ]);

    const total = Number(totalRow?.total ?? 0);
    res.json({
      items: events.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })),
      total,
      page,
      limit,
      hasMore: offset + events.length < total,
    });
  } catch (err) {
    req.log.error({ err }, "Error listing pending events");
    res.status(500).json({ error: "Internal server error" });
  }
});

async function reviewEvent(req: AuthenticatedRequest, res: any, status: "approved" | "rejected") {
  const eventId = parseInt(req.params.eventId as string, 10);
  if (isNaN(eventId)) {
    res.status(400).json({ error: "Invalid eventId" });
    return;
  }

  const message = typeof req.body?.message === "string" ? req.body.message.trim().slice(0, 2000) : "";

  try {
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId));
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const [updated] = await db
      .update(eventsTable)
      .set({
        moderationStatus: status,
        moderationMessage: message || null,
        reviewedBy: req.userId,
        reviewedAt: new Date(),
      })
      .where(eq(eventsTable.id, eventId))
      .returning();

    const notificationTitle = status === "approved" ? "Evento approvato" : "Evento rifiutato";
    const defaultMessage = status === "approved"
      ? `Il tuo evento "${event.title}" è stato approvato ed è ora pubblicato.`
      : `Il tuo evento "${event.title}" non è stato approvato.`;

    await db.insert(userNotificationsTable).values({
      userId: event.userId,
      title: notificationTitle,
      message: message || defaultMessage,
      isRead: false,
    });

    const formatted = await formatEvent(updated, req.userId);
    res.json(formatted);
  } catch (err) {
    req.log.error({ err, eventId, status }, "Error reviewing event");
    res.status(500).json({ error: "Internal server error" });
  }
}

router.patch("/admin/events/:eventId/approve", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  await reviewEvent(req, res, "approved");
});

router.patch("/admin/events/:eventId/reject", requireAuth, requireAdmin, async (req: AuthenticatedRequest, res) => {
  await reviewEvent(req, res, "rejected");
});

export default router;
