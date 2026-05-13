import { Redis } from "ioredis";
import type { Env } from "./env.js";

export type RedisClient = Redis;

/** Redis client for hot paths (leaderboard snapshots, ephemeral contest keys). */
export function createRedis(env: Env): RedisClient {
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: 2 });
}
