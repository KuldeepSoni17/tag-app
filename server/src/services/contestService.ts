import { DateTime } from "luxon";
import type { Contest } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

/** Calendar date in Asia/Kolkata stored as UTC midnight of that Y-M-D (stable for @db.Date). */
export function istCalendarDateUtc(d: DateTime = DateTime.now().setZone("Asia/Kolkata")): Date {
  return new Date(Date.UTC(d.year, d.month - 1, d.day));
}

export async function getContestForIstDate(date: Date): Promise<Contest | null> {
  return prisma.contest.findUnique({ where: { date } });
}

export async function ensureTodaysContest(): Promise<Contest> {
  const date = istCalendarDateUtc();
  let c = await prisma.contest.findUnique({ where: { date } });
  if (!c) {
    c = await prisma.contest.create({
      data: { date, status: "OPEN", prizeAmount: 0 },
    });
  }
  return c;
}

export async function listRecentContests(take = 7): Promise<Contest[]> {
  return prisma.contest.findMany({ orderBy: { date: "desc" }, take });
}

export async function closeContestRecord(contestId: string): Promise<void> {
  await prisma.contest.update({
    where: { id: contestId },
    data: { status: "CLOSED" },
  });
}

export async function setContestWinner(
  contestId: string,
  winnerId: string,
  criteriaRevealed: string,
  prizeAmount: number,
): Promise<void> {
  await prisma.contest.update({
    where: { id: contestId },
    data: {
      winnerId,
      criteriaRevealed,
      prizeAmount,
      status: "CLOSED",
    },
  });
}

export async function setEncryptedCriteria(
  contestId: string,
  parts: { ciphertext: string; iv: string; authTag: string },
): Promise<void> {
  await prisma.contest.update({
    where: { id: contestId },
    data: {
      criteriaEncrypted: parts.ciphertext,
      criteriaIv: parts.iv,
      criteriaAuthTag: parts.authTag,
    },
  });
}

export type CriteriaRule = { questionId: number; answer: string };

export function parseCriteriaJson(json: string): CriteriaRule[] {
  const data = JSON.parse(json) as unknown;
  if (!Array.isArray(data)) throw new Error("Criteria must be an array");
  return data.map((row) => {
    if (!row || typeof row !== "object") throw new Error("Invalid criteria row");
    const questionId = Number((row as { question_id?: number; questionId?: number }).questionId ?? (row as { question_id?: number }).question_id);
    const answer = String((row as { answer?: string }).answer ?? "");
    if (!Number.isFinite(questionId) || !answer) throw new Error("Invalid criteria fields");
    return { questionId, answer };
  });
}
