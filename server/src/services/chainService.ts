import type { RedisClient } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";
import { ensureTodaysContest } from "./contestService.js";
import { evaluateFraudForChain } from "./fraudService.js";
import { notifyTagRequest } from "./notificationService.js";

/** Ensure the user has an approved singleton chain for today's contest (creates if missing). */
export async function ensureUserChain(userId: string) {
  const contest = await ensureTodaysContest();

  const existing = await prisma.chainNode.findFirst({
    where: {
      userId,
      approvedAt: { not: null },
      chain: { contestId: contest.id },
    },
    include: {
      chain: {
        include: {
          nodes: { orderBy: { position: "asc" }, include: { user: { select: { id: true, username: true } } } },
        },
      },
    },
  });

  if (existing) {
    return { contest, chain: existing.chain };
  }

  const chain = await prisma.chain.create({
    data: {
      contestId: contest.id,
      headUserId: userId,
      tailUserId: userId,
      length: 1,
      nodes: {
        create: {
          userId,
          taggedByUserId: null,
          approvedAt: new Date(),
          position: 0,
        },
      },
    },
    include: {
      nodes: { orderBy: { position: "asc" }, include: { user: { select: { id: true, username: true } } } },
    },
  });

  return { contest, chain };
}

export async function getPendingIncomingTag(userId: string) {
  const contest = await ensureTodaysContest();
  const pending = await prisma.chainNode.findFirst({
    where: {
      userId,
      approvedAt: null,
      chain: { contestId: contest.id },
    },
    include: {
      chain: true,
      user: { select: { id: true, username: true } },
    },
  });
  if (!pending || !pending.taggedByUserId) return null;
  const tagger = await prisma.user.findUnique({
    where: { id: pending.taggedByUserId },
    select: { username: true },
  });
  return { pending, taggerUsername: tagger?.username ?? "unknown" };
}

export async function sendTagRequest(fromUserId: string, toUsername: string) {
  const contest = await ensureTodaysContest();
  const toUser = await prisma.user.findFirst({
    where: { username: toUsername.toLowerCase() },
  });
  if (!toUser) throw new Error("User not found");
  if (toUser.id === fromUserId) throw new Error("Cannot tag yourself");

  const fromChain = await prisma.chain.findFirst({
    where: { contestId: contest.id, tailUserId: fromUserId },
    include: { nodes: true },
  });
  if (!fromChain) throw new Error("You are not the tail of a chain");

  const pending = await prisma.chainNode.findFirst({
    where: { userId: toUser.id, approvedAt: null, chain: { contestId: contest.id } },
  });
  if (pending) throw new Error("User already has a pending tag");

  const bApproved = await prisma.chainNode.findMany({
    where: { userId: toUser.id, approvedAt: { not: null }, chain: { contestId: contest.id } },
    include: { chain: true },
  });
  let soloChainId: string | null = null;
  if (bApproved.length === 1) {
    const ch = bApproved[0].chain;
    if (ch.length === 1 && ch.headUserId === toUser.id && ch.tailUserId === toUser.id) {
      soloChainId = ch.id;
    } else {
      throw new Error("User is already in another chain");
    }
  } else if (bApproved.length > 1) {
    throw new Error("Invalid chain state for target user");
  }

  const position = fromChain.length;
  const node = await prisma.$transaction(async (tx) => {
    if (soloChainId) {
      await tx.chain.delete({ where: { id: soloChainId } });
    }
    return tx.chainNode.create({
      data: {
        chainId: fromChain.id,
        userId: toUser.id,
        taggedByUserId: fromUserId,
        approvedAt: null,
        position,
      },
    });
  });

  await notifyTagRequest({
    targetUserId: toUser.id,
    fromUsername: (await prisma.user.findUnique({ where: { id: fromUserId } }))?.username ?? "someone",
  });

  return { nodeId: node.id, chainId: fromChain.id };
}

export async function respondToTag(userId: string, nodeId: string, action: "approve" | "ignore", clientIp?: string | null) {
  const node = await prisma.chainNode.findUnique({
    where: { id: nodeId },
    include: { chain: true },
  });
  if (!node || node.userId !== userId) throw new Error("Tag not found");
  if (node.approvedAt) throw new Error("Already processed");

  if (action === "ignore") {
    await prisma.chainNode.delete({ where: { id: nodeId } });
    return { status: "ignored" as const };
  }

  await prisma.$transaction(async (tx) => {
    await tx.chainNode.update({
      where: { id: nodeId },
      data: { approvedAt: new Date(), approvedIp: clientIp ?? null },
    });
    await tx.chain.update({
      where: { id: node.chainId },
      data: {
        tailUserId: userId,
        length: { increment: 1 },
      },
    });
  });

  await evaluateFraudForChain(node.chainId);
  return { status: "approved" as const, chainId: node.chainId };
}

/** Push a lightweight leaderboard snapshot to Redis for dashboards. */
export async function refreshChainLeaderboard(redis: RedisClient, contestId: string) {
  const top = await prisma.chain.findMany({
    where: { contestId, fraudFlag: false },
    orderBy: { length: "desc" },
    take: 50,
    select: { id: true, length: true, headUserId: true, tailUserId: true },
  });
  await redis.set(`contest:${contestId}:chains`, JSON.stringify(top), "EX", 60);
}
