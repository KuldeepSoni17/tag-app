import { prisma } from "../lib/prisma.js";

function ipv4Subnet(ip: string | null | undefined): string | null {
  if (!ip || !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return null;
  const parts = ip.split(".").slice(0, 3);
  return parts.join(".");
}

/**
 * Heuristics only — flagged chains surface in admin review; never auto-ban here.
 */
export async function evaluateFraudForChain(chainId: string): Promise<void> {
  const chain = await prisma.chain.findUnique({
    where: { id: chainId },
    include: {
      nodes: {
        where: { approvedAt: { not: null } },
        orderBy: { position: "asc" },
        include: { user: true },
      },
    },
  });
  if (!chain) return;

  const reasons: string[] = [];

  const times = chain.nodes.map((n) => n.approvedAt!.getTime()).sort((a, b) => a - b);
  if (times.length >= 2) {
    const delta = times[times.length - 1] - times[0];
    if (delta <= 60_000) {
      reasons.push("all_approvals_within_60s");
    }
  }

  const subnets = chain.nodes.map((n) => ipv4Subnet(n.approvedIp)).filter(Boolean) as string[];
  if (subnets.length >= 2 && new Set(subnets).size === 1) {
    reasons.push("shared_ipv4_subnet");
  }

  for (const u of chain.nodes.map((n) => n.user)) {
    const hoursSinceReg = (Date.now() - u.createdAt.getTime()) / 3_600_000;
    if (hoursSinceReg < 24 && chain.length >= 5) {
      reasons.push("fresh_account_high_chain");
      break;
    }
  }

  if (reasons.length === 0) return;

  await prisma.$transaction([
    prisma.chain.update({
      where: { id: chainId },
      data: { fraudFlag: true, isEligible: false },
    }),
    ...reasons.map((reason) =>
      prisma.fraudFlag.create({
        data: { chainId, reason },
      }),
    ),
  ]);
}

/** Called after winner pick: flag if winner account is younger than 24h at contest date. */
export async function flagIfWinnerTooFresh(contestId: string, winnerId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: winnerId } });
  const contest = await prisma.contest.findUnique({ where: { id: contestId } });
  if (!user || !contest) return;
  const contestStart = contest.date.getTime();
  const reg = user.createdAt.getTime();
  if (reg >= contestStart - 24 * 3_600_000) {
    const chain = await prisma.chain.findFirst({
      where: { contestId, nodes: { some: { userId: winnerId, approvedAt: { not: null } } } },
      orderBy: { length: "desc" },
    });
    if (!chain) return;
    await prisma.fraudFlag.create({
      data: { chainId: chain.id, reason: "winner_account_created_within_24h_of_contest" },
    });
    await prisma.chain.update({ where: { id: chain.id }, data: { fraudFlag: true, isEligible: false } });
  }
}
