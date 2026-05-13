import cron from "node-cron";
import type { Env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { istCalendarDateUtc } from "../services/contestService.js";
import { runWinnerSelection } from "../services/winnerService.js";
import { notifyContestClosingSoon } from "../services/notificationService.js";
import type { RedisClient } from "../lib/redis.js";
import { refreshChainLeaderboard } from "../services/chainService.js";

/**
 * IST-based jobs: ensure leaderboard snapshots, close contest at end of day,
 * and nudge players before close.
 */
export function registerContestCron(env: Env, redis: RedisClient) {
  cron.schedule(
    "*/5 * * * *",
    async () => {
      const date = istCalendarDateUtc();
      const contest = await prisma.contest.findUnique({ where: { date } });
      if (contest?.status === "OPEN") {
        await refreshChainLeaderboard(redis, contest.id);
      }
    },
    { timezone: "Asia/Kolkata" },
  );

  cron.schedule(
    "59 22 * * *",
    async () => {
      const ids = (await prisma.user.findMany({ select: { id: true }, take: 2000 })).map((u) => u.id);
      await notifyContestClosingSoon(ids);
    },
    { timezone: "Asia/Kolkata" },
  );

  cron.schedule(
    "59 23 * * *",
    async () => {
      const date = istCalendarDateUtc();
      const contest = await prisma.contest.findUnique({ where: { date } });
      if (contest && contest.status === "OPEN") {
        await runWinnerSelection(contest.id, env);
      }
    },
    { timezone: "Asia/Kolkata" },
  );
}
