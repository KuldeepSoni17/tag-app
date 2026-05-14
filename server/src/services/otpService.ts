import crypto from "node:crypto";
import type { Env } from "../lib/env.js";
import { prisma } from "../lib/prisma.js";
import { sha256Hex } from "../lib/crypto.js";
import { phoneHash, normalizePhone } from "./phoneService.js";
import { sendOtpMsg91 } from "./msg91Service.js";

const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function randomOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function requestOtp(env: Env, rawPhone: string): Promise<void> {
  const phone = normalizePhone(rawPhone);
  const hash = phoneHash(env, phone);
  const code = randomOtp();
  const codeHash = sha256Hex(`${code}:otp`);

  await prisma.otpSession.create({
    data: {
      phoneHash: hash,
      codeHash,
      expiresAt: new Date(Date.now() + OTP_TTL_MS),
    },
  });

  await sendOtpMsg91(env, phone, code);
}

export async function verifyOtp(env: Env, rawPhone: string, code: string): Promise<string> {
  const phone = normalizePhone(rawPhone);
  const hash = phoneHash(env, phone);

  /** Demo / staging: when MSG91 is not configured, accept `DEV_STATIC_OTP` in any NODE_ENV. */
  const staticBypass =
    Boolean(env.DEV_STATIC_OTP && code === env.DEV_STATIC_OTP) && !env.MSG91_AUTH_KEY;

  if (!staticBypass) {
    const session = await prisma.otpSession.findFirst({
      where: { phoneHash: hash, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
    });
    if (!session || session.attempts >= MAX_ATTEMPTS) {
      throw new Error("OTP expired or too many attempts");
    }
    const expected = session.codeHash;
    const actual = sha256Hex(`${code}:otp`);
    if (actual !== expected) {
      await prisma.otpSession.update({
        where: { id: session.id },
        data: { attempts: { increment: 1 } },
      });
      throw new Error("Invalid OTP");
    }
    await prisma.otpSession.delete({ where: { id: session.id } });
  }

  return hash;
}

export function randomUsername(): string {
  return `player_${crypto.randomBytes(4).toString("hex")}`;
}
