import { Router } from "express";
import { db } from "@workspace/db";
import { eventsTable, eventParticipantsTable, usersTable } from "@workspace/db";
import { eq, desc, count, and, lt, lte, or, isNull, isNotNull } from "drizzle-orm";
import { requireAuth, type AuthenticatedRequest } from "../middlewares/requireAuth";
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

    let query = db.select().from(eventsTable).orderBy(desc(eventsTable.eventDate));

    const events = await query;

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

export default router;
