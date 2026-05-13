import { Router } from "express";
import type { AuthedRequest } from "../middleware/auth.js";
import { sendTagRequest, respondToTag, getPendingIncomingTag } from "../services/chainService.js";
import type { RedisClient } from "../lib/redis.js";
import { refreshChainLeaderboard } from "../services/chainService.js";
import { ensureTodaysContest } from "../services/contestService.js";

export function buildTagRouter(redis: RedisClient) {
  const r = Router();

  r.post("/send", async (req: AuthedRequest, res) => {
    if (!req.userId) return res.status(401).end();
    try {
      const toUsername = String(req.body?.username ?? "");
      const out = await sendTagRequest(req.userId, toUsername);
      const contest = await ensureTodaysContest();
      await refreshChainLeaderboard(redis, contest.id);
      res.json(out);
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  r.get("/incoming", async (req: AuthedRequest, res) => {
    if (!req.userId) return res.status(401).end();
    const pending = await getPendingIncomingTag(req.userId);
    res.json(
      pending
        ? { nodeId: pending.pending.id, from: pending.taggerUsername }
        : null,
    );
  });

  r.post("/:nodeId/respond", async (req: AuthedRequest, res) => {
    if (!req.userId) return res.status(401).end();
    try {
      const action = String(req.body?.action ?? "") as "approve" | "ignore";
      if (action !== "approve" && action !== "ignore") {
        return res.status(400).json({ error: "action must be approve|ignore" });
      }
      const clientIp = req.ip;
      const out = await respondToTag(req.userId, req.params.nodeId, action, clientIp);
      const contest = await ensureTodaysContest();
      await refreshChainLeaderboard(redis, contest.id);
      res.json(out);
    } catch (e) {
      res.status(400).json({ error: String(e) });
    }
  });

  return r;
}
