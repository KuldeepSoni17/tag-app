import { Router } from "express";
import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";
import { ensureTodaysContest } from "../services/contestService.js";
import { ensureUserChain, getPendingIncomingTag, refreshChainLeaderboard } from "../services/chainService.js";
import type { RedisClient } from "../lib/redis.js";
import type { AuthedRequest } from "../middleware/auth.js";

export function buildContestRouter(redis: RedisClient, auth: RequestHandler) {
  const r = Router();

  r.get("/today", async (_req, res) => {
    const contest = await ensureTodaysContest();
    await refreshChainLeaderboard(redis, contest.id);
    const raw = await redis.get(`contest:${contest.id}:chains`);
    const leaderboard = raw ? JSON.parse(raw) : [];
    res.json({
      contest: {
        id: contest.id,
        date: contest.date,
        status: contest.status,
        prizeAmount: contest.prizeAmount,
        winnerId: contest.winnerId,
        criteriaRevealed: contest.criteriaRevealed,
      },
      leaderboard,
    });
  });

  r.get("/me", auth, async (req: AuthedRequest, res) => {
    if (!req.userId) return res.status(401).end();
    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user) return res.status(404).json({ error: "Not found" });
    const { contest, chain } = await ensureUserChain(req.userId);
    const pending = await getPendingIncomingTag(req.userId);
    res.json({
      user: { id: user.id, username: user.username, avatarUrl: user.avatarUrl },
      contest: { id: contest.id, status: contest.status, date: contest.date },
      chain: {
        id: chain.id,
        length: chain.length,
        nodes: chain.nodes?.map((n) => ({
          position: n.position,
          username: n.user.username,
          approved: Boolean(n.approvedAt),
        })),
      },
      pendingTag: pending
        ? { nodeId: pending.pending.id, from: pending.taggerUsername }
        : null,
    });
  });

  return r;
}
