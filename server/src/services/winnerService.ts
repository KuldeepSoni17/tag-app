import type { Env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { decryptString } from "../lib/crypto.js";
import { parseCriteriaJson, type CriteriaRule } from "./contestService.js";
import { ONBOARDING_QUESTIONS } from "../lib/onboardingQuestions.js";
import { disbursePrize } from "./prizeService.js";
import { flagIfWinnerTooFresh } from "./fraudService.js";
import { notifyWinnerAnnounced } from "./notificationService.js";

async function decryptAnswerForUser(userId: string, questionId: number, env: Env): Promise<string | null> {
  const row = await prisma.userProfileAnswer.findUnique({
    where: { userId_questionId: { userId, questionId } },
  });
  if (!row) return null;
  return decryptString({ ciphertext: row.ciphertext, iv: row.iv, authTag: row.authTag }, env.ENCRYPTION_KEY);
}

function humanizeCriteria(rules: CriteriaRule[]): string {
  return rules
    .map((r) => {
      const q = ONBOARDING_QUESTIONS.find((x) => x.id === r.questionId);
      const opt = q?.options.find((o) => o.id === r.answer);
      const qLabel = q?.prompt ?? `Q${r.questionId}`;
      const aLabel = opt?.label ?? r.answer;
      return `${qLabel}: ${aLabel}`;
    })
    .join(" + ");
}

function userMatchesRules(
  answers: Map<number, string>,
  rules: CriteriaRule[],
  mode: "all" | "any" = "all",
): boolean {
  const checks = rules.map((r) => answers.get(r.questionId) === r.answer);
  return mode === "all" ? checks.every(Boolean) : checks.some(Boolean);
}

/**
 * Selects a winner using server-only criteria. Falls back through `fallbacks` (OR groups).
 * Criteria JSON shape: `{ primary: CriteriaRule[], fallbacks?: CriteriaRule[][] }`
 */
export async function runWinnerSelection(contestId: string, env: Env): Promise<void> {
  const contest = await prisma.contest.findUnique({ where: { id: contestId } });
  if (!contest || contest.status === "CLOSED") return;
  if (!contest.criteriaEncrypted || !contest.criteriaIv || !contest.criteriaAuthTag) {
    await prisma.contest.update({
      where: { id: contestId },
      data: { status: "CLOSED", criteriaRevealed: "No criteria configured for this contest." },
    });
    return;
  }

  const json = decryptString(
    {
      ciphertext: contest.criteriaEncrypted,
      iv: contest.criteriaIv,
      authTag: contest.criteriaAuthTag,
    },
    env.ENCRYPTION_KEY,
  );

  const payload = JSON.parse(json) as { primary?: CriteriaRule[]; fallbacks?: CriteriaRule[][] };
  const groups: CriteriaRule[][] = [];
  if (payload.primary?.length) groups.push(payload.primary);
  for (const f of payload.fallbacks ?? []) {
    if (f.length) groups.push(f);
  }
  if (groups.length === 0) {
    try {
      groups.push(parseCriteriaJson(json));
    } catch {
      // criteria JSON might be a structured object without `primary` — treat as unmatched rules
    }
  }

  const eligibleChains = await prisma.chain.findMany({
    where: { contestId, length: { gte: 5 }, fraudFlag: false, isEligible: true },
    orderBy: { length: "desc" },
    include: { nodes: { where: { approvedAt: { not: null } }, orderBy: { position: "asc" } } },
  });

  let winnerId: string | null = null;
  let matchedRules: CriteriaRule[] | null = null;

  outer: for (const chain of eligibleChains) {
    const userIds = chain.nodes.map((n) => n.userId);
    const answerCache = new Map<string, Map<number, string>>();
    for (const uid of userIds) {
      const map = new Map<number, string>();
      for (const qid of [1, 2, 3, 4, 5]) {
        const a = await decryptAnswerForUser(uid, qid, env);
        if (a) map.set(qid, a);
      }
      answerCache.set(uid, map);
    }

    for (const rules of groups) {
      for (const uid of userIds) {
        const answers = answerCache.get(uid)!;
        if (userMatchesRules(answers, rules, "all")) {
          winnerId = uid;
          matchedRules = rules;
          break outer;
        }
      }
    }
  }

  const prizeAmount = Number(contest.prizeAmount ?? 0);
  const revealed = matchedRules?.length
    ? `Today's winner matched: ${humanizeCriteria(matchedRules)}`
    : "No profile matched the hidden criteria among eligible chains.";

  await prisma.contest.update({
    where: { id: contestId },
    data: {
      status: "CLOSED",
      winnerId,
      criteriaRevealed: revealed,
    },
  });

  if (winnerId && prizeAmount > 0) {
    const payout = await disbursePrize(env, {
      userId: winnerId,
      amountPaise: Math.round(prizeAmount * 100),
      contestId,
    });
    await prisma.prizePayout.create({
      data: {
        contestId,
        userId: winnerId,
        amount: prizeAmount,
        razorpayId: payout.razorpayId ?? null,
        status: payout.status,
        rawResponse: payout.raw ?? null,
      },
    });
    await flagIfWinnerTooFresh(contestId, winnerId);
  }

  const notifyIds = (await prisma.user.findMany({ select: { id: true }, take: 5000 })).map((u) => u.id);
  await notifyWinnerAnnounced(notifyIds);
}