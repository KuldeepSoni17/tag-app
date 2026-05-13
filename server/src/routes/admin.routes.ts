import { Router } from "express";
import type { Env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { encryptString } from "../lib/crypto.js";
import { ensureTodaysContest, istCalendarDateUtc, setEncryptedCriteria } from "../services/contestService.js";
import { phoneHash, normalizePhone } from "../services/phoneService.js";
import { runWinnerSelection } from "../services/winnerService.js";

export function buildAdminRouter(env: Env) {
  const r = Router();

  r.post("/contests/today/criteria", async (req, res) => {
    try {
      const contest = await ensureTodaysContest();
      const raw = typeof req.body?.criteriaJson === "string" ? req.body.criteriaJson : JSON.stringify(req.body?.criteria ?? {});
      JSON.parse(raw); // validate JSON
      const enc = encryptString(raw, env.ENCRYPTION_KEY);
      await setEncryptedCriteria(contest.id, enc);
      res.json({ ok: true, contestId: contest.id });
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  r.post("/contests/today/prize", async (req, res) => {
    const amount = Number(req.body?.amount ?? 0);
    const contest = await ensureTodaysContest();
    await prisma.contest.update({
      where: { id: contest.id },
      data: { prizeAmount: amount },
    });
    res.json({ ok: true });
  });

  r.post("/contests/today/close", async (_req, res) => {
    const contest = await ensureTodaysContest();
    await runWinnerSelection(contest.id, env);
    res.json({ ok: true });
  });

  r.get("/chains", async (_req, res) => {
    const date = istCalendarDateUtc();
    const contest = await prisma.contest.findUnique({ where: { date } });
    if (!contest) return res.json([]);
    const chains = await prisma.chain.findMany({
      where: { contestId: contest.id },
      orderBy: { length: "desc" },
      include: {
        nodes: { orderBy: { position: "asc" }, include: { user: { select: { username: true } } } },
      },
    });
    res.json(chains);
  });

  r.get("/fraud", async (_req, res) => {
    const flags = await prisma.fraudFlag.findMany({
      where: { reviewed: false },
      orderBy: { createdAt: "desc" },
      include: { chain: true },
    });
    res.json(flags);
  });

  r.get("/payouts", async (_req, res) => {
    const rows = await prisma.prizePayout.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    res.json(rows);
  });

  r.get("/users/by-phone", async (req, res) => {
    const phone = String(req.query.phone ?? "");
    try {
      const norm = normalizePhone(phone);
      const hash = phoneHash(env, norm);
      const user = await prisma.user.findUnique({ where: { phoneHash: hash } });
      res.json(user);
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  r.get("/stats", async (_req, res) => {
    const date = istCalendarDateUtc();
    const contest = await prisma.contest.findUnique({ where: { date } });
    if (!contest) return res.json({ contest: null });
    const chains = await prisma.chain.findMany({ where: { contestId: contest.id } });
    const lengths = chains.map((c) => c.length);
    const avg = lengths.length ? lengths.reduce((a, b) => a + b, 0) / lengths.length : 0;
    const extendsCount = await prisma.chainNode.count({
      where: { chain: { contestId: contest.id }, taggedByUserId: { not: null }, approvedAt: { not: null } },
    });
    const uniqueUsers = await prisma.chainNode.groupBy({
      by: ["userId"],
      where: { chain: { contestId: contest.id }, approvedAt: { not: null } },
    });
    const viral = uniqueUsers.length ? extendsCount / uniqueUsers.length : 0;
    res.json({
      contestId: contest.id,
      totalChains: chains.length,
      avgLength: avg,
      viralCoefficient: viral,
    });
  });

  r.post("/fraud/:id/review", async (req, res) => {
    await prisma.fraudFlag.update({
      where: { id: req.params.id },
      data: { reviewed: true },
    });
    res.json({ ok: true });
  });

  return r;
}
