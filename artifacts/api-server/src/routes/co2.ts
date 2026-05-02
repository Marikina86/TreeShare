import { Router } from "express";
import { db } from "@workspace/db";
import { co2RankingsTable } from "@workspace/db";
import { eq, desc, inArray } from "drizzle-orm";
import { calculateCo2Rankings } from "../lib/co2Job";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdmin } from "../middlewares/requireAdmin";

const router = Router();

router.get("/co2/rankings", async (req, res) => {
  try {
    const month = typeof req.query.month === "string" ? req.query.month : null;

    let rows;
    if (month) {
      rows = await db
        .select()
        .from(co2RankingsTable)
        .where(eq(co2RankingsTable.month, month))
        .orderBy(co2RankingsTable.rank);
    } else {
      const allMonths = await db
        .selectDistinct({ month: co2RankingsTable.month })
        .from(co2RankingsTable)
        .orderBy(desc(co2RankingsTable.month))
        .limit(12);

      if (allMonths.length === 0) {
        return res.json({ months: [], rankings: {} });
      }

      const monthList = allMonths.map((m) => m.month);
      rows = await db
        .select()
        .from(co2RankingsTable)
        .where(inArray(co2RankingsTable.month, monthList))
        .orderBy(desc(co2RankingsTable.month), co2RankingsTable.rank);

      const rankings: Record<string, typeof rows> = {};
      for (const row of rows) {
        if (!rankings[row.month]) rankings[row.month] = [];
        rankings[row.month].push(row);
      }

      return res.json({ months: monthList, rankings });
    }

    return res.json(rows);
  } catch (err) {
    req.log.error({ err }, "Error fetching CO2 rankings");
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/co2/recalculate", requireAuth, requireAdmin, async (req, res) => {
  try {
    await calculateCo2Rankings();
    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "Error recalculating CO2 rankings");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
