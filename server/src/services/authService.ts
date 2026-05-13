import type { Env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { encryptString } from "../lib/crypto.js";
import { ONBOARDING_QUESTIONS, validateQuizPayload } from "../lib/onboardingQuestions.js";
import { verifyOtp, randomUsername } from "./otpService.js";
import { phoneHash, normalizePhone } from "./phoneService.js";
import { signUserToken } from "./jwtService.js";

export async function registerUser(
  env: Env,
  input: {
    phone: string;
    otp: string;
    username?: string;
    answers: Record<string, string>;
    clientIp?: string | null;
  },
) {
  const normalized = normalizePhone(input.phone);
  const ph = phoneHash(env, normalized);
  await verifyOtp(env, input.phone, input.otp);

  const existing = await prisma.user.findUnique({ where: { phoneHash: ph } });
  if (existing) {
    throw new Error("Phone already registered");
  }

  const username = (input.username?.trim() || randomUsername()).toLowerCase();
  if (!/^[\w.]{3,20}$/.test(username)) {
    throw new Error("Username must be 3-20 chars: letters, numbers, _, .");
  }

  const taken = await prisma.user.findUnique({ where: { username } });
  if (taken) throw new Error("Username taken");

  const answers = validateQuizPayload(input.answers);

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: {
        phoneHash: ph,
        username,
        registrationIp: input.clientIp ?? null,
        lastIp: input.clientIp ?? null,
      },
    });

    for (const q of ONBOARDING_QUESTIONS) {
      const letter = answers[q.id];
      const enc = encryptString(letter, env.ENCRYPTION_KEY);
      await tx.userProfileAnswer.create({
        data: {
          userId: u.id,
          questionId: q.id,
          ciphertext: enc.ciphertext,
          iv: enc.iv,
          authTag: enc.authTag,
        },
      });
    }
    return u;
  });

  const token = signUserToken(env, user.id, ph);
  return { user, token };
}

export async function loginUser(env: Env, input: { phone: string; otp: string; clientIp?: string | null }) {
  const normalized = normalizePhone(input.phone);
  const ph = phoneHash(env, normalized);
  const user = await prisma.user.findUnique({ where: { phoneHash: ph } });
  if (!user) {
    throw new Error("No account for this number — complete sign up first.");
  }
  await verifyOtp(env, input.phone, input.otp);
  if (user.isBanned && user.bannedUntil && user.bannedUntil > new Date()) {
    throw new Error("Account suspended");
  }
  if (input.clientIp) {
    await prisma.user.update({ where: { id: user.id }, data: { lastIp: input.clientIp } });
  }
  const token = signUserToken(env, user.id, ph);
  return { user, token };
}
